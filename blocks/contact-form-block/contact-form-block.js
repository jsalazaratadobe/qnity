import { readBlockConfig } from '../../scripts/aem.js';

function SetStatus(StatusEl, Message, Type) {
  StatusEl.classList.remove('is-error', 'is-success');
  StatusEl.textContent = '';
  if (!Message) return;
  StatusEl.textContent = Message;
  StatusEl.classList.add(Type === 'error' ? 'is-error' : 'is-success');
}

function IsValidUSPhone(Raw) {
  if (/[a-z]/i.test(Raw || '')) return false;

  const Re = /^(\+?1[\s\-\.]?)?(\(?\d{3}\)?[\s\-\.]?)\d{3}[\s\-\.]?\d{4}$/;
  if (!Re.test((Raw || '').trim())) return false;

  const Digits = (Raw || '').replace(/\D/g, '');
  if (Digits.length === 10) return true;
  if (Digits.length === 11 && Digits.startsWith('1')) return true;
  return false;
}

function NormalizeUSPhone(Raw) {
  const Digits = (Raw || '').replace(/\D/g, '');
  if (Digits.length === 10) return `+1${Digits}`;
  if (Digits.length === 11 && Digits.startsWith('1')) return `+${Digits}`;
  return Digits;
}

function GetConfigValue(Config, ...Keys) {
  for (const Key of Keys) {
    const Value = Config?.[Key];
    if (Value !== undefined && Value !== null && String(Value).trim() !== '') return String(Value).trim();
  }
  return '';
}

export default function decorate(Block) {
  const Config = readBlockConfig(Block);

  // Support both camelCase and dashed keys (depends on authored key labels).
  const Title = GetConfigValue(Config, 'title');
  const Description = GetConfigValue(Config, 'description', 'headline', 'headline-message', 'headlineMessage');
  const SubmitText = GetConfigValue(Config, 'submittext', 'submit-text', 'submitText') || 'Submit';
  const SuccessText = GetConfigValue(Config, 'successtext', 'success-text', 'successText')
    || 'Thank You, Someone Will Contact You Shortly.';
  const PrivacyText = GetConfigValue(Config, 'privacytext', 'privacy-text', 'privacyText');
  const Endpoint = GetConfigValue(Config, 'endpoint');

  const Wrapper = document.createElement('div');
  Wrapper.className = 'contact-form-block__inner';

  const Intro = document.createElement('div');
  Intro.className = 'contact-form-block__intro';
  Intro.innerHTML = `
    <h2 class="contact-form-block__editable" contenteditable="true" spellcheck="true">${Title || 'Lorem Ipsum'}</h2>
    <p class="contact-form-block__editable" contenteditable="true" spellcheck="true">${Description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}</p>
  `;

  const Form = document.createElement('form');
  Form.className = 'contact-form-block__form';
  Form.noValidate = true;

  const Fields = document.createElement('div');
  Fields.className = 'contact-form-block__fields';
  Fields.innerHTML = `
    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Salutation</span>
      <select name="salutation" required>
        <option value="" selected disabled>Select…</option>
        <option>Mr.</option>
        <option>Ms.</option>
        <option>Mrs.</option>
        <option>Mx.</option>
        <option>Dr.</option>
      </select>
    </label>

    <label class="contact-form-block__field">
      <span class="contact-form-block__label">First Name</span>
      <input name="firstName" type="text" autocomplete="given-name" required />
    </label>

    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Last Name</span>
      <input name="lastName" type="text" autocomplete="family-name" required />
    </label>

    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Email Address</span>
      <input name="email" type="email" autocomplete="email" required />
    </label>

    <label class="contact-form-block__field">
      <span class="contact-form-block__label">Phone Number</span>
      <input
        name="phone"
        type="tel"
        autocomplete="tel"
        required
        inputmode="tel"
        placeholder="(602) 555-0123"
        aria-describedby="phone-hint"
        pattern="^(\+?1[\s\-\.]?)?(\(?\d{3}\)?[\s\-\.]?)\d{3}[\s\-\.]?\d{4}$"
      />
      <span id="phone-hint" class="contact-form-block__hint">
        Enter A Valid US Phone Number (10 Digits). Examples: (602) 555-0123, 602-555-0123, +1 602 555 0123
      </span>
    </label>
  `;

  const Actions = document.createElement('div');
  Actions.className = 'contact-form-block__actions';

  const Button = document.createElement('button');
  Button.type = 'submit';
  Button.className = 'contact-form-block__submit';
  Button.textContent = SubmitText;

  const Status = document.createElement('div');
  Status.className = 'contact-form-block__status';
  Status.setAttribute('aria-live', 'polite');

  Actions.append(Button, Status);
  Form.append(Fields, Actions);

  if (PrivacyText) {
    const Privacy = document.createElement('div');
    Privacy.className = 'contact-form-block__privacy';
    Privacy.textContent = PrivacyText;
    Form.append(Privacy);
  }

  // Clear custom errors as user edits.
  const PhoneEl = Form.elements.phone;
  PhoneEl.addEventListener('input', () => {
    PhoneEl.setCustomValidity('');
    SetStatus(Status, '', null);
  });

  Form.addEventListener('submit', async (Event) => {
    Event.preventDefault();
    SetStatus(Status, '', null);

    // Native validation (required + email syntax + phone pattern)
    if (!Form.checkValidity()) {
      SetStatus(Status, 'Please Complete All Required Fields.', 'error');
      Form.reportValidity();
      return;
    }

    // Strong phone validation (beyond pattern)
    const PhoneRaw = PhoneEl.value.trim();
    if (!IsValidUSPhone(PhoneRaw)) {
      PhoneEl.setCustomValidity('Please Enter A Valid US Phone Number.');
      SetStatus(Status, 'Please Enter A Valid Phone Number.', 'error');
      Form.reportValidity();
      return;
    }

    PhoneEl.setCustomValidity('');
    PhoneEl.value = NormalizeUSPhone(PhoneRaw);

    // Optional: Submit to endpoint if configured.
    if (Endpoint) {
      try {
        Button.disabled = true;
        Button.setAttribute('aria-busy', 'true');

        const Payload = {
          salutation: Form.elements.salutation.value,
          firstName: Form.elements.firstName.value.trim(),
          lastName: Form.elements.lastName.value.trim(),
          email: Form.elements.email.value.trim(),
          phone: PhoneEl.value,
          source: window.location.href,
        };

        const Response = await fetch(Endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Payload),
        });

        if (!Response.ok) throw new Error(`Request failed (${Response.status})`);
      } catch (Err) {
        // eslint-disable-next-line no-console
        console.error('contact-form-block submit error', Err);
        SetStatus(Status, 'Sorry, Something Went Wrong. Please Try Again.', 'error');
        Button.disabled = false;
        Button.removeAttribute('aria-busy');
        return;
      } finally {
        Button.disabled = false;
        Button.removeAttribute('aria-busy');
      }
    }

    Form.reset();
    SetStatus(Status, SuccessText, 'success');
  });

  Wrapper.append(Intro, Form);

  Block.textContent = '';
  Block.append(Wrapper);
}
