/**
 * Layout mínimo para /cuenta/*.
 * Las rutas legacy redirigen a /me/*; las solicitudes de rol mantienen este layout sin nav duplicado.
 */
export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>;
}
