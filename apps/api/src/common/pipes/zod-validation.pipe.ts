import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';
import { ValidationException } from '../exceptions/validation.exception';

type SchemaLike = { parse: (value: unknown) => unknown };

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: SchemaLike) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error: unknown) {
      const details = this.mapIssues(error);
      throw new ValidationException(details);
    }
  }

  private mapIssues(error: unknown): { path: (string | number)[]; message: string }[] {
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = (error as { issues?: Array<{ path?: (string | number)[]; message?: string }> }).issues;
      if (Array.isArray(issues)) {
        return issues.map((i) => ({
          path: i.path ?? [],
          message: i.message ?? 'Validation error',
        }));
      }
    }
    return [{ path: [], message: 'Validation failed' }];
  }
}
