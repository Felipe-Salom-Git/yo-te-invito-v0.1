type Props = {
  className?: string;
};

/** Short notice shown above legal acceptance checkboxes. */
export function LegalRequirementNotice({ className = '' }: Props) {
  return (
    <p className={`text-sm leading-relaxed text-text-muted ${className}`}>
      Para continuar, aceptá los términos vigentes. Estos documentos pueden actualizarse; si
      publicamos una nueva versión requerida, te pediremos aceptarla nuevamente. La aceptación
      queda registrada con fecha y versión.
    </p>
  );
}
