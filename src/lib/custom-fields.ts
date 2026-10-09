/**
 * Custom review-form fields.
 *
 * A project can add up to MAX_CUSTOM_FIELDS extra fields (text or select) to the
 * widget form. Each submitted review stores a snapshot of the answers it got,
 * with the label and the "show publicly" flag as they were at submit time.
 * Import-safe on the server: everything here is pure.
 */
import { MAX_CUSTOM_FIELDS, type CustomFieldAnswer, type CustomFormField } from "@/db/schema";

const FIELD_LABEL_LIMIT = 80;
const FIELD_VALUE_LIMIT = 500;
const FIELD_OPTION_LIMIT = 30;

export function parseFormFields(input: unknown): { formFields: CustomFormField[]; error: string | null } {
  const list = input === undefined || input === null ? [] : input;
  if (!Array.isArray(list)) return { formFields: [], error: "Form fields must be a list." };
  if (list.length > MAX_CUSTOM_FIELDS) {
    return { formFields: [], error: `You can add up to ${MAX_CUSTOM_FIELDS} custom fields.` };
  }
  const seen = new Set<string>();
  const formFields: CustomFormField[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") return { formFields: [], error: "Invalid custom field." };
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 40) : "";
    const label = typeof item.label === "string" ? item.label.trim().slice(0, FIELD_LABEL_LIMIT) : "";
    const type = item.type === "select" ? "select" : "text";
    if (!id) return { formFields: [], error: "Every custom field needs an id." };
    if (seen.has(id)) return { formFields: [], error: "Custom field ids must be unique." };
    seen.add(id);
    if (!label) return { formFields: [], error: "Every custom field needs a label." };
    const options = type === "select"
      ? Array.from(new Set(
          Array.isArray(item.options)
            ? item.options
                .filter((option): option is string => typeof option === "string" && option.trim().length > 0)
                .map((option) => option.trim().slice(0, FIELD_OPTION_LIMIT))
            : [],
        )).slice(0, 20)
      : [];
    if (type === "select" && options.length < 2) {
      return { formFields: [], error: `The select field “${label}” needs at least two options.` };
    }
    formFields.push({
      id,
      label,
      type,
      options,
      required: item.required === true,
      showPublic: item.showPublic === true,
    });
  }
  return { formFields, error: null };
}

/**
 * Turns the submitted `{ fieldId: value }` map into the snapshot stored on the
 * review, enforcing required rules and select options.
 */
export function buildCustomAnswers(
  submitted: unknown,
  fields: CustomFormField[],
): { customFields: CustomFieldAnswer[]; error: string | null } {
  const values = submitted && typeof submitted === "object" && !Array.isArray(submitted)
    ? (submitted as Record<string, unknown>)
    : {};
  const customFields: CustomFieldAnswer[] = [];
  for (const field of fields) {
    const raw = values[field.id];
    const value = typeof raw === "string" ? raw.trim().slice(0, FIELD_VALUE_LIMIT) : "";
    if (field.required && !value) {
      return { customFields: [], error: `Please fill in “${field.label}”.` };
    }
    if (field.type === "select" && value && !field.options.includes(value)) {
      return { customFields: [], error: `Choose one of the listed options for “${field.label}”.` };
    }
    if (!value) continue;
    customFields.push({ id: field.id, label: field.label, value, showPublic: field.showPublic });
  }
  return { customFields, error: null };
}
