import { getEmailTemplateRenderer } from './email-template.registry';
import type {
  EmailTemplateId,
  RenderEmailTemplateInput,
  RenderedEmailTemplate,
} from './email-template.types';

export function renderEmailTemplate(
  input: RenderEmailTemplateInput,
): RenderedEmailTemplate {
  const renderer = getEmailTemplateRenderer(input.templateId);
  return renderer(input.variables ?? {});
}

export function renderEmailTemplateById(
  templateId: EmailTemplateId,
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  return renderEmailTemplate({ templateId, variables });
}
