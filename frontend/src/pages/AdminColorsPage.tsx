import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { api } from '../services/api';
import type { Color } from '../types';

export function AdminColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameKa, setNameKa] = useState('');
  const [hexCode, setHexCode] = useState('#000000');
  const [editing, setEditing] = useState<Color | null>(null);
  const [error, setError] = useState('');
  const { t } = useI18n();

  const load = () => { api.colors(true).then(setColors).catch(() => setColors([])); };
  useEffect(load, []);

  const resetForm = () => {
    setNameEn('');
    setNameKa('');
    setHexCode('#000000');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.saveColor({ ...editing, nameEn, nameKa, hexCode });
        setEditing(null);
      } else {
        await api.saveColor({
          nameEn,
          nameKa,
          hexCode,
          isEnabled: true,
          displayOrder: colors.length + 1,
        });
      }
      resetForm();
      load();
    } catch (exception) {
      setError((exception as Error).message);
    }
  };

  const startEdit = (color: Color) => {
    setEditing(color);
    setError('');
    setNameEn(color.nameEn);
    setNameKa(color.nameKa);
    setHexCode(color.hexCode);
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
    resetForm();
  };

  const remove = async (id: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    await api.deleteColor(id);
    load();
  };

  const toggleEnabled = async (color: Color) => {
    await api.saveColor({ ...color, isEnabled: !color.isEnabled });
    load();
  };

  return (
    <div>
      <div className="admin-heading">
        <p className="eyebrow">{t('colorList')}</p>
        <h1>{t('colors')}</h1>
      </div>
      <form className="inline-form" onSubmit={submit}>
        <input
          value={nameEn}
          onChange={event => setNameEn(event.target.value)}
          placeholder={t('nameEn')}
          required
        />
        <input
          value={nameKa}
          onChange={event => setNameKa(event.target.value)}
          placeholder={t('nameKa')}
        />
        <input
          type="color"
          value={hexCode}
          onChange={event => setHexCode(event.target.value)}
          className="color-input"
          aria-label={t('hexCode')}
        />
        <button className="btn btn-dark" type="submit">
          {editing ? t('saveProduct') : t('addColor')}
        </button>
        {editing && (
          <button className="btn btn-outline" type="button" onClick={cancelEdit}>✕</button>
        )}
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-table">
        {colors.map(color => (
          <article className="admin-row admin-row-text" key={color.id}>
            <div className="swatch">
              <i style={{ background: color.hexCode }} />
              <div>
                <strong>{color.nameEn}</strong>
                <span>{color.nameKa || '—'}</span>
                <span>{color.hexCode}</span>
              </div>
            </div>
            <div className="admin-row-actions">
              <button
                className={color.isEnabled ? 'status active' : 'status'}
                onClick={() => toggleEnabled(color)}
                style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
              >
                {color.isEnabled ? t('enabled') : t('disabled')}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => startEdit(color)}>
                {t('editCategory')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(color.id)}>
                {t('deleteCategory')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
