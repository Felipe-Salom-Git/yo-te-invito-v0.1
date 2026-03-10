import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Gastro module — stub implementation.
 * Returns empty data for list methods; create/update throw NotImplemented.
 * Full implementation requires DB models (GastroContent, GastroDiscount, GastroValidation).
 */
@Injectable()
export class GastroService {
  async listContent(_eventId: string) {
    return [];
  }

  async createContent(_eventId: string, _input: unknown) {
    throw new NotImplementedException('Gastro module not yet implemented');
  }

  async updateContent(_id: string, _patch: unknown) {
    throw new NotImplementedException('Gastro module not yet implemented');
  }

  async listDiscounts(_eventId: string) {
    return [];
  }

  async createDiscount(_eventId: string, _input: unknown) {
    throw new NotImplementedException('Gastro module not yet implemented');
  }

  async updateDiscount(_id: string, _patch: unknown) {
    throw new NotImplementedException('Gastro module not yet implemented');
  }

  async listValidations(_discountId?: string) {
    return [];
  }

  async recordValidation(_discountId: string, _userId?: string, _orderId?: string) {
    throw new NotImplementedException('Gastro module not yet implemented');
  }
}
