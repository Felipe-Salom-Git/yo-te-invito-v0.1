'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle } from '@/components';
import { GeneralPublicationCreateForm } from '@/components/admin/general-publications/GeneralPublicationCreateForm';

export default function AdminPublicacionGeneralNuevaPage() {
  return (
    <PageContainer>
      <Link
        href="/admin/publicaciones-generales"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Publicaciones Generales
      </Link>
      <SectionTitle>Nueva publicación general</SectionTitle>
      <p className="mt-2 text-text-muted">
        Elegí la categoría y completá el formulario correspondiente. No incluye venta de entradas.
      </p>
      <div className="mt-6">
        <GeneralPublicationCreateForm />
      </div>
    </PageContainer>
  );
}
