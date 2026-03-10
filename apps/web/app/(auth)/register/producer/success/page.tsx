import Link from 'next/link';
import { Card, CardHeader, CardContent, Button } from '@/components';
import { Logo } from '@/components/brand/Logo';

export default function ProducerApplicationSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8">
      <Logo variant="auth" showText />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold text-text">Solicitud enviada</h1>
          <p className="text-sm text-text-muted">
            Tu solicitud para ser productora fue enviada. Te avisaremos cuando sea aprobada.
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/home">
            <Button className="w-full">Volver al inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
