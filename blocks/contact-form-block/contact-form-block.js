import { readBlockConfig } from '../../scripts/aem.js';

function SetStatus(StatusEl, Message, Type) {
  StatusEl.classList.remove('Is-Error', 'Is-Success');
  StatusEl.textContent = '';
  if (!Message) return;
  StatusEl.textContent = Message;
  StatusEl.classList.add(Type === 'Error' ? 'Is-Error' : 'Is-Success');
}

function IsValidUSPhone(Raw) {
  const Value = (Raw || '').trim();
  if (!Value) return false;
  if (/[a-z]/i.test(Value)) return false;

  // Accept: 6025550123, 602-555-0123, (602) 555-0123, +1 602 555 0123, 1-602-555-0123
  const Regex = /^(\+?1[\s\-\.]?)?(\(?\d{3}\)?[\s\-\.]?)\d{3}[\s\-\.]?\d{4}$/;
  if (!Regex.test(Value)) return false;

  // Digit Count Sanity Check (10 digits, or 11 starting with 1)
  const Digits = Value.replace(/\D/g, '');
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

export default function decorate(Block) {
  const Config = readBlockConfig(Block);

  const Title = (Config.title || 'Lorem Ipsum').trim();
  const Description = (Config.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.').trim();
  const SuccessText = (Config.successtext || 'Thank You, Someone Will Contact You Shortly.').trim();
  const SubmitLabel = (Config.submittext || 'Submit').trim();

  const Wrapper = document.createElement('div');
  Wrapper.className = 'contact-form-block__inner';

  const Intro = document.createElement('div');
  Intro.className = 'contact-form-block__intro';
  Intro.innerHTML = `
    <h2>${Title}</h2>
    <p>${Description}</p>
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
        aria-describedby="contact-form-block-phone-hint"
        pattern="^(\+?1[\s\-\.]?)?(\(?\d{3}\)?[\s\-\.]?)\d{3}[\s\-\.]?\d{4}$"
      />
      <span id="contact-form-block-phone-hint" class="contact-form-block__hint">
        Enter A Valid US Phone Number (10 Digits). Examples: (602) 555-0123, 602-555-0123, +1 602 555 0123
      </span>
    </label>
  `;

  const Actions = document.createElement('div');
  Actions.className = 'contact-form-block__actions';

  const Button = document.createElement('button');
  Button.type = 'submit';
  Button.className = 'contact-form-block__submit';
  Button.textContent = SubmitLabel;

  const Status = document.createElement('div');
  Status.className = 'contact-form-block__status';
  Status.setAttribute('aria-live', 'polite');

  Actions.append(Button, Status);
  Form.append(Fields, Actions);

  // Clear Phone Custom Validity As The User Types
  Form.elements.phone.addEventListener('input', () => {
    Form.elements.phone.setCustomValidity('');
    SetStatus(Status, '', null);
  });

  Form.addEventListener('submit', (Event) => {
    Event.preventDefault();
    SetStatus(Status, '', null);

    // Native Validation (Required + Email Syntax + Phone Pattern)
    if (!Form.checkValidity()) {
      SetStatus(Status, 'Please Complete All Required Fields.', 'Error');
      Form.reportValidity();
      return;
    }

    // Strong Phone Validation
    const PhoneEl = Form.elements.phone;
    const PhoneRaw = PhoneEl.value.trim();

    if (!IsValidUSPhone(PhoneRaw)) {
      PhoneEl.setCustomValidity('Please Enter A Valid US Phone Number.');
      SetStatus(Status, 'Please Enter A Valid Phone Number.', 'Error');
      Form.reportValidity();
      return;
    }

    PhoneEl.setCustomValidity('');
    PhoneEl.value = NormalizeUSPhone(PhoneRaw);

    Form.reset();
    SetStatus(Status, SuccessText, 'Success');
  });

  Wrapper.append(Intro, Form);

  Block.textContent = '';
  Block.append(Wrapper);
}
