import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GetnetWebhookService } from './getnet-webhook.service';

@Controller('public/payments')
export class PublicPaymentsGetnetWebhookController {
  constructor(private readonly getnetWebhook: GetnetWebhookService) {}

  @Post('getnet/webhook')
  @HttpCode(HttpStatus.OK)
  handleGetnetWebhook(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.getnetWebhook.handleWebhook({ body, headers });
  }
}
