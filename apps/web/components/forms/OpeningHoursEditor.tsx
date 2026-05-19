'use client';

import {
  createEmptyRentalOpeningHours,
  type OpeningHoursBlock,
  type OpeningHoursException,
  type RentalOpeningHours,
} from '@yo-te-invito/shared';

export type OpeningHoursEditorProps = {
  value: RentalOpeningHours;
  onChange: (value: RentalOpeningHours) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
  noteLabel?: string;
};

function cloneBlock(block: OpeningHoursBlock): OpeningHoursBlock {
  return {
    isOpen: block.isOpen,
    ranges: block.ranges.map((r) => ({ ...r })),
  };
}

function cloneSchedule(schedule: RentalOpeningHours): RentalOpeningHours {
  return {
    weekday: cloneBlock(schedule.weekday),
    saturday: cloneBlock(schedule.saturday),
    sunday: cloneBlock(schedule.sunday),
    exceptions: schedule.exceptions.map((ex) => ({
      ...ex,
      ranges: ex.ranges.map((r) => ({ ...r })),
    })),
  };
}

function ScheduleBlockEditor({
  title,
  block,
  onChange,
}: {
  title: string;
  block: OpeningHoursBlock;
  onChange: (block: OpeningHoursBlock) => void;
}) {
  const setRange = (index: number, field: 'open' | 'close', value: string) => {
    const ranges = block.ranges.map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );
    onChange({ ...block, ranges });
  };

  return (
    <section className="rounded-lg border border-border bg-bg-muted p-4">
      <div>
        <h3 className="font-medium text-text">{title}</h3>
        <label className="mt-2 flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={block.isOpen}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { isOpen: true, ranges: [{ open: '09:00', close: '18:00' }] }
                  : { isOpen: false, ranges: [] },
              )
            }
            className="rounded border-border"
          />
          Abierto
        </label>
      </div>

      {block.isOpen ? (
        <div className="mt-3 space-y-2">
          {block.ranges.map((range, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={range.open}
                onChange={(e) => setRange(index, 'open', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              <span className="text-text-muted">–</span>
              <input
                type="time"
                value={range.close}
                onChange={(e) => setRange(index, 'close', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              {block.ranges.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...block,
                      ranges: block.ranges.filter((_, i) => i !== index),
                    })
                  }
                  className="text-sm text-red-400 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...block,
                ranges: [...block.ranges, { open: '16:00', close: '20:00' }],
              })
            }
            className="text-sm text-accent hover:underline"
          >
            + Agregar horario
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-muted">Cerrado</p>
      )}
    </section>
  );
}

function ExceptionEditor({
  exception,
  onChange,
  onRemove,
}: {
  exception: OpeningHoursException;
  onChange: (ex: OpeningHoursException) => void;
  onRemove: () => void;
}) {
  const setRange = (index: number, field: 'open' | 'close', value: string) => {
    const ranges = exception.ranges.map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );
    onChange({ ...exception, ranges });
  };

  return (
    <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Fecha</label>
          <input
            type="date"
            value={exception.date}
            onChange={(e) => onChange({ ...exception, date: e.target.value })}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Motivo / etiqueta</label>
          <input
            type="text"
            value={exception.label}
            onChange={(e) => onChange({ ...exception, label: e.target.value })}
            placeholder="Ej. Feriado, Temporada alta"
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={exception.isOpen}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { ...exception, isOpen: true, ranges: [{ open: '09:00', close: '18:00' }] }
                : { ...exception, isOpen: false, ranges: [] },
            )
          }
          className="rounded border-border"
        />
        Abierto
      </label>

      {exception.isOpen && (
        <div className="space-y-2">
          {exception.ranges.map((range, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={range.open}
                onChange={(e) => setRange(index, 'open', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              <span className="text-text-muted">–</span>
              <input
                type="time"
                value={range.close}
                onChange={(e) => setRange(index, 'close', e.target.value)}
                className="rounded border border-border bg-bg px-2 py-1.5 text-sm text-text"
              />
              {exception.ranges.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...exception,
                      ranges: exception.ranges.filter((_, i) => i !== index),
                    })
                  }
                  className="text-sm text-red-400 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...exception,
                ranges: [...exception.ranges, { open: '09:00', close: '21:00' }],
              })
            }
            className="text-sm text-accent hover:underline"
          >
            + Agregar horario
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-red-400 hover:underline"
      >
        Eliminar excepción
      </button>
    </div>
  );
}

export function OpeningHoursEditor({
  value,
  onChange,
  note = '',
  onNoteChange,
  noteLabel = 'Nota sobre horarios (opcional)',
}: OpeningHoursEditorProps) {
  const update = (patch: Partial<RentalOpeningHours>) =>
    onChange({ ...cloneSchedule(value), ...patch });

  const addException = () => {
    const today = new Date().toISOString().slice(0, 10);
    update({
      exceptions: [
        ...value.exceptions,
        {
          date: today,
          label: '',
          isOpen: false,
          ranges: [],
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-text">Horario de atención</label>
        <p className="text-xs text-text-muted">
          Horario habitual. Las excepciones por fecha tienen prioridad ese día.
        </p>
      </div>

      <ScheduleBlockEditor
        title="Lunes a viernes"
        block={value.weekday}
        onChange={(weekday) => update({ weekday })}
      />

      <ScheduleBlockEditor
        title="Sábado"
        block={value.saturday}
        onChange={(saturday) => update({ saturday })}
      />

      <ScheduleBlockEditor
        title="Domingo"
        block={value.sunday}
        onChange={(sunday) => update({ sunday })}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text">Excepciones especiales</h3>
          <button
            type="button"
            onClick={addException}
            className="text-sm text-accent hover:underline"
          >
            + Agregar excepción
          </button>
        </div>
        {value.exceptions.length === 0 ? (
          <p className="text-sm text-text-muted">
            Sin excepciones. Agregá feriados, mantenimiento o horarios de temporada.
          </p>
        ) : (
          value.exceptions.map((ex, index) => (
            <ExceptionEditor
              key={`${ex.date}-${index}`}
              exception={ex}
              onChange={(patch) => {
                const exceptions = value.exceptions.map((item, i) =>
                  i === index ? patch : item,
                );
                update({ exceptions });
              }}
              onRemove={() =>
                update({
                  exceptions: value.exceptions.filter((_, i) => i !== index),
                })
              }
            />
          ))
        )}
      </section>

      {onNoteChange && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">{noteLabel}</label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            placeholder="Ej. Los horarios pueden variar según clima o temporada."
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </div>
      )}
    </div>
  );
}

export { createEmptyRentalOpeningHours };
