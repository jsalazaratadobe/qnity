function findGroupedContainer(block, groupPrefix) {
  // Universal Editor + model grouping results in fields rendered within the block,
  // with grouping typically producing a "content" div that holds the grouped nodes.
  // We’ll just locate the first element that contains any of the expected nodes.
  const candidates = [...block.querySelectorAll(':scope > div, :scope > div > div')];
  return candidates.find((el) => el.textContent && el.querySelector(`[data-name^="${groupPrefix}"]`))
    || block;
}

function getFieldValue(block, fieldName) {
  // In practice, UE-rendered HTML may not always include data-name attributes
  // depending on your setup. So we support two strategies:
  //  1) Prefer elements with data-name="{fieldName}"
  //  2) Fallback: look for a wrapper whose first child is the authored value for that field
  const byDataName = block.querySelector(`[data-name="${fieldName}"]`);
  if (byDataName) return byDataName;

  // Fallback heuristic: find any element that looks like it contains the authored field
  // (common output is simple div wrappers)
  const all = [...block.querySelectorAll('div, p, h1, h2, h3, a')];
  const match = all.find((el) => el.getAttribute && el.getAttribute('data-aue-prop') === fieldName);
  if (match) return match;

  return null;
}

function asText(el, fallback = '') {
  if (!el) return fallback;
  return (el.textContent || '').trim() || fallback;
}

function asHTML(el, fallback = '') {
  if (!el) return fallback;
  return el.innerHTML?.trim() || fallback;
}

export default function decorate(block) {
  // Read authored content from the existing semantic HTML
  const introEl = getFieldValue(block, 'formContent_text') || block.querySelector(':scope h1, :scope h2, :scope h3, :scope p');
  const endpointEl = getFieldValue(block, 'formContent_endpoint');
  const submitTextEl = getFieldValue(block, 'formContent_submitText');
  const successEl = getFieldValue(block, 'formContent_successText');
  const privacyEl = getFieldValue(block, 'formContent_privacyText');

  const endpoint = asText(endpointEl, '').trim();
  const submitText = asText(submitTextEl, 'Send');
  const successHTML = asHTML(successEl, '<p>Thanks! Your message was sent.</p>');
  const introHTML = introEl ? (introEl.closest('div') ? introEl.closest('div').innerHTML : introEl.outerHTML) : '<h2>Contact us</h2>';

  // Build the final UI
  const wrapper = document.createElement('div');
  wrapper.className = 'contact-form-block__inner';

  const intro = document.createElement('div');
  intro.className = 'contact-form-block__intro';
  intro.innerHTML = introHTML;

  const form = document.createElement('form');
  form.className = 'contact-form-block__form';
  form.noValidate = true;

  const fields = document.createElement('div');
  fields.className = 'contact-form-block__fields';

  fields.innerHTML = `
    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Name</span>
      <input name="name" type="text" autocomplete="name" required />
    </label>
    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Email</span>
      <input name="email" type="email" autocomplete="email" required />
    </label>
    <label class="contact-form-block__field contact-form-block__field--message">
      <span class="contact-form-block__label">Message</span>
      <textarea name="message" rows="6" required></textarea>
    </label>
  `;

  const actions = document.createElement('div');
  actions.className = 'contact-form-block__actions';

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'contact-form-block__submit';
  button.textContent = submitText;

  const status = document.createElement('div');
  status.className = 'contact-form-block__status';
  status.setAttribute('aria-live', 'polite');

  actions.append(button, status);

  const privacy = document.createElement('div');
  privacy.className = 'contact-form-block__privacy';
  privacy.innerHTML = privacyEl ? privacyEl.innerHTML : '';

  form.append(fields, actions, privacy);

  // Submit behavior
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.classList.remove('is-error', 'is-success');

    if (!form.checkValidity()) {
      status.textContent = 'Please complete all required fields.';
      status.classList.add('is-error');
      form.reportValidity();
      return;
    }

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
      source: window.location.href,
    };

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      if (endpoint) {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
      }

      form.reset();
      status.innerHTML = successHTML;
      status.classList.add('is-success');
    } catch (err) {
      status.textContent = 'Sorry — something went wrong. Please try again.';
      status.classList.add('is-error');
      // eslint-disable-next-line no-console
      console.error('contact-form-block submit error', err);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  wrapper.append(intro, form);

  // Replace authored output with decorated output
  block.textContent = '';
  block.append(wrapper);
}
