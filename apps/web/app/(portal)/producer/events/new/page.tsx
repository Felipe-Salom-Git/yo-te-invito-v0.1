'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { eventFormSchema, type EventFormData, type TandaFormItem } from '@/lib/schemas/event';
import { PageContainer, SectionTitle, Button, Input, useToast, Breadcrumbs } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function CreateEventPage() {
    const router = useRouter();
    const { status } = useSession();
    const repos = useRepositories();
    const queryClient = useQueryClient();
    const { tenantId } = useTenant();
    const PRODUCER_ID = useProducerId();
    const { addToast } = useToast();
    const t = tenantId ?? 'tenant-demo';

    const defaultForm: EventFormData = {
        title: '',
        description: '',
        startAt: new Date().toISOString().slice(0, 16),
        endAt: '',
        city: '',
        venueName: '',
        venueAddress: '',
        capacityTotal: null,
        coverImageUrl: null,
        geoLat: null,
        geoLng: null,
        isTicketingEnabled: true,
        status: 'draft',
    };

    const [form, setForm] = useState<EventFormData>(defaultForm);
    const [tandas, setTandas] = useState<TandaFormItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useMutation({
        mutationFn: async ({ data, tandasToCreate }: { data: EventFormData; tandasToCreate: TandaFormItem[] }) => {
            const event = await repos.events.create({
                tenantId: t,
                producerId: PRODUCER_ID,
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
                media: data.coverImageUrl ? [{ id: `img-${Date.now()}`, type: 'image', url: data.coverImageUrl, sortOrder: 0 }] : [],
            });
            for (let i = 0; i < tandasToCreate.length; i++) {
                const ta = tandasToCreate[i]!;
                await repos.ticketTypes.create(event.id, {
                    name: ta.name,
                    price: ta.price,
                    capacityAvailable: ta.capacityAvailable,
                });
            }
            return event;
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
        onSuccess: (event) => {
            addToast('Evento creado exitosamente', 'success');
            queryClient.invalidateQueries({ queryKey: ['events', 'producer', PRODUCER_ID] });
            router.push(`/producer/events/${event.id}`);
        },
    });

    const addTanda = () => setTandas((p) => [...p, { name: '', price: 0, capacityAvailable: 10 }]);
    const removeTanda = (i: number) => setTandas((p) => p.filter((_, j) => j !== i));
    const setTanda = (i: number, patch: Partial<TandaFormItem>) =>
        setTandas((p) => p.map((ta, j) => (j === i ? { ...ta, ...patch } : ta)));

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file?.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => setForm((p) => ({ ...p, coverImageUrl: reader.result as string }));
        reader.readAsDataURL(file);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = eventFormSchema.safeParse(form);
        if (!parsed.success) {
            const errs: Record<string, string> = {};
            parsed.error.errors.forEach((err) => { const p = err.path[0] as string; if (p) errs[p] = err.message; });
            setErrors(errs);
            return;
        }
        const capTotal = parsed.data.capacityTotal ?? null;
        const sumCap = tandas.reduce((s, ta) => s + ta.capacityAvailable, 0);
        if (capTotal != null && capTotal > 0 && tandas.length > 0 && sumCap > capTotal) {
            setErrors({ tandas: `La suma de cupos (${sumCap}) supera la capacidad total (${capTotal})` });
            return;
        }
        setErrors({});
        createMutation.mutate({ data: parsed.data, tandasToCreate: tandas });
    };

    if (status === 'unauthenticated') {
        return (
            <PageContainer>
                <p className="text-text-muted">Iniciá sesión para continuar.</p>
                <Link href="/login" className="text-accent underline mt-2 block">Login</Link>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <Breadcrumbs items={[{ label: 'Mis eventos', href: '/producer/events' }, { label: 'Crear Evento' }]} />

            <div className="mb-8">
                <SectionTitle>Crear Nuevo Evento</SectionTitle>
                <p className="mt-2 text-text-muted">Publicá una nueva fiesta o espectáculo. Podés comenzar como borrador o publicarlo directamente.</p>
            </div>

            <div className="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
                        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Información Principal</h3>
                        <Input label="Título del Evento" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Ej: Fiesta Bresh - Edición Invierno" />
                        <Input label="Fecha y Hora de inicio" type="datetime-local" value={form.startAt} onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Ciudad" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Ej: Buenos Aires" />
                            <Input label="Lugar (Venue)" value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} placeholder="Ej: Estadio GEBA" />
                        </div>

                        <div className="pt-2">
                            <label className="mb-1.5 block text-sm font-medium text-text">Imagen de Portada</label>
                            <Input label="URL de la imagen" value={form.coverImageUrl ?? ''} onChange={(e) => setForm((p) => ({ ...p, coverImageUrl: e.target.value || null }))} placeholder="https://…" />
                            <label className="mt-3 text-sm text-text-muted cursor-pointer flex items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-bg hover:border-accent transition-colors">
                                <span className="mr-2">📁 Subir archivo desde tu dispositivo</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
                            <h3 className="font-semibold text-text text-lg">Entradas y Capacidad</h3>
                        </div>
                        <p className="text-sm text-text-muted mb-4">Definí el cupo máximo de venta de entradas y los lotes que estarán disponibles inicialmente.</p>

                        <Input
                            label="Capacidad máxima del recinto (opcional)"
                            type="number"
                            min={0}
                            value={form.capacityTotal ?? ''}
                            onChange={(e) => setForm((p) => ({ ...p, capacityTotal: e.target.value ? parseInt(e.target.value, 10) : null }))}
                            placeholder="Ej: 1500"
                        />

                        <div className="mt-8">
                            <h4 className="text-sm font-medium text-text mb-3">Tandas de venta configuradas</h4>

                            <div className="space-y-4">
                                {tandas.map((ta, i) => (
                                    <div key={i} className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-5 relative shadow-sm">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-1">
                                                <Input label="Nombre de Tanda" value={ta.name} onChange={(e) => setTanda(i, { name: e.target.value })} placeholder="Ej. Early Bird" />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <Input label="Precio ($)" type="number" min={0} value={ta.price || ''} onChange={(e) => setTanda(i, { price: parseInt(e.target.value, 10) || 0 })} />
                                            </div>
                                            <div className="sm:col-span-1">
                                                <Input label="Cupo Inicial" type="number" min={1} value={ta.capacityAvailable || ''} onChange={(e) => setTanda(i, { capacityAvailable: parseInt(e.target.value, 10) || 0 })} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="button" size="sm" variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={() => removeTanda(i)}>
                                                Eliminar tanda
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button type="button" variant="secondary" className="w-full mt-4 border-dashed py-6" onClick={addTanda}>
                                + Agregar nueva tanda
                            </Button>
                            {errors.tandas && <p className="text-sm text-red-500 font-medium mt-2">{errors.tandas}</p>}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-bg-muted p-6 space-y-4">
                        <h3 className="font-semibold text-text text-lg border-b border-border pb-3 mb-4">Ubicación y Detalles</h3>

                        <Input label="Dirección Exacta" value={form.venueAddress ?? ''} onChange={(e) => setForm((p) => ({ ...p, venueAddress: e.target.value || undefined }))} placeholder="Av. Corrientes 1234, CABA" />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Input label="Latitud" type="number" step="any" value={form.geoLat ?? ''} onChange={(e) => setForm((p) => ({ ...p, geoLat: e.target.value ? Number(e.target.value) : null }))} placeholder="-34.6037" />
                            <Input label="Longitud" type="number" step="any" value={form.geoLng ?? ''} onChange={(e) => setForm((p) => ({ ...p, geoLng: e.target.value ? Number(e.target.value) : null }))} placeholder="-58.3816" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 pb-20">
                        <Link href="/producer/events">
                            <Button type="button" variant="outline" className="px-8">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={createMutation.isPending} className="px-8">
                            {createMutation.isPending ? 'Creando evento...' : 'Crear Evento'}
                        </Button>
                    </div>
                </form>
            </div>
        </PageContainer>
    );
}
