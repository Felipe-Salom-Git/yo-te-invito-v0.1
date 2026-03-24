'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { UpdateProducerProfileInput } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';

export default function ProducerProfilePage() {
    const repos = useRepositories();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['producer', 'my-profile'],
        queryFn: () => repos.producers.getMyProfile(),
    });

    const [formData, setFormData] = useState<Partial<UpdateProducerProfileInput>>({});

    useEffect(() => {
        if (profile) {
            setFormData({
                displayName: profile.displayName ?? '',
                slug: profile.slug ?? '',
                legalName: profile.legalName ?? '',
                shortDescription: profile.shortDescription ?? '',
                longDescription: profile.longDescription ?? '',
                logoUrl: profile.logoUrl ?? '',
                coverImageUrl: profile.coverImageUrl ?? '',
                primaryPhone: profile.primaryPhone ?? '',
                secondaryPhone: profile.secondaryPhone ?? '',
                primaryEmail: profile.primaryEmail ?? '',
                secondaryEmail: profile.secondaryEmail ?? '',
                whatsapp: profile.whatsapp ?? '',
                city: profile.city ?? '',
                country: profile.country ?? '',
            });
        }
    }, [profile]);

    const mutation = useMutation({
        mutationFn: (data: UpdateProducerProfileInput) => repos.producers.updateMyProfile(data),
        onSuccess: () => {
            addToast('Perfil actualizado correctamente', 'success');
            queryClient.invalidateQueries({ queryKey: ['producer', 'my-profile'] });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || 'Error al actualizar perfil';
            addToast(msg, 'error');
        },
    });

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData as UpdateProducerProfileInput);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    if (isLoading) {
        return (
            <PageContainer>
                <p className="text-text-muted">Cargando perfil...</p>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <div className="mb-6">
                <SectionTitle>Mi Perfil de Productor</SectionTitle>
                <p className="mt-2 text-text-muted">
                    Completá tu información pública para que tus clientes te conozcan.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Nombre público (Display Name)" name="displayName" value={formData.displayName ?? ''} onChange={handleChange} required />
                    <Input label="Identificador URL (Slug)" name="slug" value={formData.slug ?? ''} onChange={handleChange} placeholder="ej. fiesta-bresh" required />
                </div>

                <Input label="Descripción Corta" name="shortDescription" value={formData.shortDescription ?? ''} onChange={handleChange} />

                <div className="space-y-1">
                    <label className="text-sm font-medium text-text">Descripción Larga</label>
                    <textarea
                        name="longDescription"
                        rows={4}
                        value={formData.longDescription ?? ''}
                        onChange={handleChange}
                        className="w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-text outline-none focus:border-accent"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Ciudad" name="city" value={formData.city ?? ''} onChange={handleChange} />
                    <Input label="País" name="country" value={formData.country ?? ''} onChange={handleChange} />
                </div>

                <div className="pt-4 border-t border-border">
                    <SectionTitle>Datos de Contacto</SectionTitle>
                    <p className="mb-4 text-sm text-text-muted">La forma en que los clientes y referidores pueden contactarse.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Email Principal" name="primaryEmail" type="email" value={formData.primaryEmail ?? ''} onChange={handleChange} />
                        <Input label="WhatsApp (público)" name="whatsapp" value={formData.whatsapp ?? ''} onChange={handleChange} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </PageContainer>
    );
}
