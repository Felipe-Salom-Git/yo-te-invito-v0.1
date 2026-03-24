'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { eventFormSchema, type EventFormData } from '@/lib/schemas/event';
import { PageContainer, SectionTitle, Button, Input, useToast, PageLoader, Breadcrumbs } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params?.eventId as string;
    const { status } = useSession();
    const repos = useRepositories();
    const queryClient = useQueryClient();
    const { tenantId } = useTenant();
    const PRODUCER_ID = useProducerId();
    const { addToast } = useToast();
    const t = tenantId ?? 'tenant-demo';

    const { data: eventData, isLoading } = useQuery({
        queryKey: ['event', eventId],
        queryFn: () => repos.events.getDetailForProducer(eventId),
        enabled: !!eventId,
    });

    const [form, setForm] = useState<EventFormData | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (eventData) {
            setForm({
                title: eventData.title,
                description: eventData.description || '',
                startAt: new Date(eventData.startAt).toISOString().slice(0, 16),
                endAt: eventData.endAt ? new Date(eventData.endAt).toISOString().slice(0, 16) : '',
                city: eventData.city || '',
                venueName: eventData.venueName || '',
                venueAddress: eventData.venueAddress || '',
                capacityTotal: eventData.capacityTotal ?? null,
                coverImageUrl: eventData.media?.[0]?.url || null,
                geoLat: eventData.geoLat ?? null,
                geoLng: eventData.geoLng ?? null,
                isTicketingEnabled: eventData.isTicketingEnabled,
                status: (eventData.status as 'draft' | 'pending' | 'approved') || 'draft',
            });
        }
    }, [eventData]);

    const updateMutation = useMutation({
        mutationFn: async (data: EventFormData) => {
            const updated = await repos.events.update(eventId, {
                title: data.title,
                description: data.description || null,
                startAt: data.startAt ? new Date(data.startAt).toISOString() : new Date().toISOString(),
                endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
                city: data.city || null,
                venueName: data.venueName || null,
                venueAddress: data.venueAddress || null,
                capacityTotal: data.capacityTotal ?? null,
                coverImageUrl: data.coverImageUrl || null,
                geoLat: data.geoLat ?? null,
                geoLng: data.geoLng ?? null,
                isTicketingEnabled: data.isTicketingEnabled,
                status: data.status,
            });
            return updated;
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: () => {
            addToast('Evento actualizado exitosamente', 'success');
            queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            router.push(`/producer/events/${eventId}`);
        },
    });

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file?.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => setForm((p) => p ? { ...p, coverImageUrl: reader.result as string } : null);
        reader.readAsDataURL(file);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        const parsed = eventFormSchema.safeParse(form);
        if (!parsed.success) {
            const errs: Record<string, string> = {};
            parsed.error.errors.forEach((err) => { const p = err.path[0] as string; if (p) errs[p] = err.message; });
            setErrors(errs);
            return;
        }
        setErrors({});
        updateMutation.mutate(parsed.data);
    };

    if (status === 'unauthenticated') {
        return (
            <PageContainer>
                <p className="text-text-muted">Iniciá sesión para continuar.</p>
                <Link href="/login" className="text-accent underline mt-2 block">Login</Link>
            </PageContainer>
        );
    }

    if (isLoading || !form) {
        return <PageLoader />;
    }

    return (
        <PageContainer>
            <Breadcrumbs items={[{ label: 'Mis eventos', href: '/producer/events' }, { label: 'Editar Evento' }]} />

            <div className="mb-8">
                <SectionTitle>Editar Evento</SectionTitle>
                <p className="mt-2 text-text-muted">Modificá la información general de la fecha. Los cupos y precios se editan en el detalle del evento.</p>
            </div>

            <div className="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
                        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Información Principal</h3>
                        <Input label="Título del Evento" value={form.title} onChange={(e) => setForm((p) => p ? { ...p, title: e.target.value } : null)} required />
                        <Input label="Fecha y Hora de inicio" type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => p ? { ...p, startAt: e.target.value } : null)} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Ciudad" value={form.city} onChange={(e) => setForm((p) => p ? { ...p, city: e.target.value } : null)} />
                            <Input label="Lugar (Venue)" value={form.venueName} onChange={(e) => setForm((p) => p ? { ...p, venueName: e.target.value } : null)} />
                        </div>

                        <div className="pt-2">
                            <label className="mb-1.5 block text-sm font-medium text-text">Imagen de Portada</label>
                            <Input label="URL de la imagen" value={form.coverImageUrl ?? ''} onChange={(e) => setForm((p) => p ? { ...p, coverImageUrl: e.target.value || null } : null)} placeholder="https://…" />
                            <label className="mt-3 text-sm text-text-muted cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-bg hover:border-accent transition-colors">
                                <span className="mr-2">📁 Subir archivo (Reemplazará la actual)</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>

                        <Input
                            label="Capacidad máxima del recinto (opcional)"
                            type="number"
                            min={0}
                            value={form.capacityTotal ?? ''}
                            onChange={(e) => setForm((p) => p ? { ...p, capacityTotal: e.target.value ? parseInt(e.target.value, 10) : null } : null)}
                        />
                    </div>

                    <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
                        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Ubicación y Detalles</h3>

                        <Input label="Dirección Exacta" value={form.venueAddress ?? ''} onChange={(e) => setForm((p) => p ? { ...p, venueAddress: e.target.value || undefined } : null)} placeholder="Av. Corrientes 1234, CABA" />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Input label="Latitud" type="number" step="any" value={form.geoLat ?? ''} onChange={(e) => setForm((p) => p ? { ...p, geoLat: e.target.value ? Number(e.target.value) : null } : null)} placeholder="-34.6037" />
                            <Input label="Longitud" type="number" step="any" value={form.geoLng ?? ''} onChange={(e) => setForm((p) => p ? { ...p, geoLng: e.target.value ? Number(e.target.value) : null } : null)} placeholder="-58.3816" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 pb-20">
                        <Link href={`/producer/events/${eventId}`}>
                            <Button type="button" variant="outline" className="px-8">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={updateMutation.isPending} className="px-8">
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </PageContainer>
    );
}
