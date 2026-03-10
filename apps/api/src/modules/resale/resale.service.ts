import { Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Resale module — stub implementation.
 * Returns empty data for list methods; create/purchase throw NotImplemented.
 * Full implementation requires DB models (ResaleListing).
 */
@Injectable()
export class ResaleService {
  async get(_listingId: string) {
    return null;
  }

  async listActive() {
    return [];
  }

  async listByEvent(_eventId: string) {
    return [];
  }

  async create(_input: unknown) {
    throw new NotImplementedException('Resale module not yet implemented');
  }

  async purchase(_listingId: string, _buyerUserId: string) {
    throw new NotImplementedException('Resale module not yet implemented');
  }
}
