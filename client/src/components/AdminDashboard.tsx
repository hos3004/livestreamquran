import React, { useMemo, useState } from 'react';
import type { AppConfig, LayoutPreset, LayoutRect } from '../types';

interface Props {
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
  layoutPresets: LayoutPreset[];
  saveLayoutPresets: (layoutPresets: LayoutPreset[]) => Promise<unknown> | void;
}

type AdminSection = 'general' | 'presets' | 'effects' | 'obs' | 'readers';

const numberOr = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const AdminDashboard: React.FC<Props> = ({ config, updateConfig, layoutPresets, saveLayoutPresets }) => {
  const [section, setSection] = useState<AdminSection>('general');

  const activePreset = useMemo(
    () => layoutPresets.find(p => p.id === config.layoutPreset) ?? null,
    [layoutPresets, config.layoutPreset],
  );

  const updatePreset = (id: number, patch: Partial<LayoutPreset>) => {
    saveLayoutPresets(layoutPresets.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const updatePresetRect = (id: number, key: 'slide' | 'page' | 'info', patch: Partial<LayoutRect>) => {
    const preset = layoutPresets.find(p => p.id === id);
    if (!preset) return;
    updatePreset(id, { [key]: { ...preset[key], ...patch } } as Partial<LayoutPreset>);
  };

  const addPreset = () => {
    const maxId = Math.max(1, ...layoutPresets.map(p => p.id));
    const source = activePreset ?? layoutPresets[0] ?? {
      id: 2,
      name: 'ثيم 2',
      frame: '/frame-preset2.png',
      quranZoom: 0.7,
      background: '#000000',
      slide: { x: 0, y: 0, w: 1100, h: 600 },
      page: { x: 1050, y: 160, w: 760, h: 760 },
      info: { x: 460, y: 640, w: 520, h: 300 },
    };
    const id = maxId + 1;
    const newPreset: LayoutPreset = {
      ...source,
      id,
      name: `ثيم ${id}`,
      frame: `/frame-preset${id}.png`,
    };
    saveLayoutPresets([...layoutPresets, newPreset]);
    updateConfig({ layoutPreset: id });
    setSection('presets');
  };

  const duplicateActivePreset = () => {
    if (!activePreset) return addPreset();
    const maxId = Math.max(1, ...layoutPresets.map(p => p.id));
    const id = maxId + 1;
    const copy: LayoutPreset = {
      ...activePreset,
      id,
      name: `${activePreset.name} - نسخة`,
      frame: `/frame-preset${id}.png`,
    };
    saveLayoutPresets([...layoutPresets, copy]);
    updateConfig({ layoutPreset: id });
  };

  const deleteActivePreset = () => {
    if (!activePreset) return;
    const next = layoutPresets.filter(p => p.id !== activePreset.id);
    saveLayoutPresets(next);
    updateConfig({ layoutPreset: next[0]?.id ?? 1 });
  };

  const NumberField = ({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) => (
    <div className="mb-3">
      <label className="form-label small text-muted">{label}</label>
      <input className="form-control" type="number" value={value} step={step} onChange={e => onChange(numberOr(e.target.value, value))} />
    </div>
  );

  const CommandBox = ({ title, command }: { title: string; command: string }) => (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <h6 className="fw-bold mb-3">{title}</h6>
        <pre className="admin-command mb-0" dir="ltr"><code>{command}</code></pre>
      </div>
    </div>
  );

  const RectEditor = ({ title, rectKey }: { title: string; rectKey: 'slide' | 'page' | 'info' }) => {
    if (!activePreset) return null;
    const rect = activePreset[rectKey];
    return (
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 fw-bold">{title}</h6>
            <span className="badge text-bg-light border">x:{rect.x} y:{rect.y} w:{rect.w} h:{rect.h}</span>
          </div>
          <div className="row g-3">
            <div className="col-md-3"><NumberField label="X" value={rect.x} onChange={v => updatePresetRect(activePreset.id, rectKey, { x: v })} /></div>
            <div className="col-md-3"><NumberField label="Y" value={rect.y} onChange={v => updatePresetRect(activePreset.id, rectKey, { y: v })} /></div>
            <div className="col-md-3"><NumberField label="العرض" value={rect.w} onChange={v => updatePresetRect(activePreset.id, rectKey, { w: v })} /></div>
            <div className="col-md-3"><NumberField label="الارتفاع" value={rect.h} onChange={v => updatePresetRect(activePreset.id, rectKey, { h: v })} /></div>
          </div>
        </div>
      </div>
    );
  };

  const sectionButton = (id: AdminSection, label: string, icon: string) => (
    <button className={`admin-nav-link ${section === id ? 'active' : ''}`} onClick={() => setSection(id)}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="admin-dashboard" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">☪</div>
          <div>
            <h1>لوحة التحكم</h1>
            <p>Quran Broadcast</p>
          </div>
        </div>
        <nav className="admin-nav">
          {sectionButton('general', 'الإعدادات العامة', '⚙️')}
          {sectionButton('presets', 'الثيمات والتوزيع', '🎛️')}
          {sectionButton('effects', 'المؤثرات البصرية', '✨')}
          {sectionButton('obs', 'التشغيل و OBS', '📺')}
          {sectionButton('readers', 'القرّاء والصوتيات', '🎙️')}
        </nav>
        <div className="admin-sidebar-footer">
          <a className="btn btn-outline-light w-100" href="/" target="_blank" rel="noreferrer">فتح شاشة البث</a>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h2 className="mb-1">إدارة البث المرئي للقرآن</h2>
            <p className="text-muted mb-0">تحكم في الثيمات، توزيع المصحف، السلايدر، والمؤثرات من صفحة مستقلة.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <span className="badge rounded-pill text-bg-success px-3 py-2">الثيم الحالي: {config.layoutPreset}</span>
            <a className="btn btn-dark rounded-pill px-4" href="/" target="_blank" rel="noreferrer">معاينة البث</a>
          </div>
        </header>

        <section className="admin-content">
          {section === 'general' && (
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-4">الإعدادات العامة</h5>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">الثيم المستخدم</label>
                        <select className="form-select" value={config.layoutPreset ?? 1} onChange={e => updateConfig({ layoutPreset: Number(e.target.value) })}>
                          <option value={1}>الثيم الأصلي</option>
                          {layoutPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">اسم القارئ</label>
                        <input className="form-control" value={config.reciterName} onChange={e => updateConfig({ reciterName: e.target.value })} />
                      </div>
                      <div className="col-md-6"><NumberField label="صفحة البداية" value={config.startPage} onChange={v => updateConfig({ startPage: v })} /></div>
                      <div className="col-md-6"><NumberField label="تكبير المصحف في الثيم الأصلي" value={config.scrollZoomFactor} step={0.05} onChange={v => updateConfig({ scrollZoomFactor: v })} /></div>
                      <div className="col-md-6"><NumberField label="زمن تغيير صور السلايدر بالمللي ثانية" value={config.slideshowInterval} step={500} onChange={v => updateConfig({ slideshowInterval: v })} /></div>
                      <div className="col-md-6"><NumberField label="مدة انتقال السلايدر بالمللي ثانية" value={config.slideshowTransitionDuration} step={100} onChange={v => updateConfig({ slideshowTransitionDuration: v })} /></div>
                    </div>
                    <div className="form-check form-switch mt-3">
                      <input className="form-check-input" type="checkbox" checked={config.loopMode} onChange={e => updateConfig({ loopMode: e.target.checked })} id="loopMode" />
                      <label className="form-check-label" htmlFor="loopMode">تكرار التشغيل بعد آخر صفحة</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 bg-dark text-white h-100">
                  <div className="card-body p-4">
                    <h5 className="fw-bold">معلومة مهمة</h5>
                    <p className="text-white-50 mb-0">أي تعديل هنا يتم حفظه تلقائيًا في ملفات JSON عبر السيرفر المحلي. شاشة البث تبقى نظيفة بدون لوحة تحكم.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'presets' && (
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm rounded-4 sticky-lg-top admin-sticky-card">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">إدارة الثيمات</h5>
                    <select className="form-select mb-3" value={config.layoutPreset ?? 1} onChange={e => updateConfig({ layoutPreset: Number(e.target.value) })}>
                      <option value={1}>الثيم الأصلي</option>
                      {layoutPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="d-grid gap-2">
                      <button className="btn btn-primary" onClick={addPreset}>+ إضافة ثيم جديد</button>
                      <button className="btn btn-outline-primary" onClick={duplicateActivePreset} disabled={!activePreset}>نسخ الثيم الحالي</button>
                      <button className="btn btn-outline-danger" onClick={deleteActivePreset} disabled={!activePreset}>حذف الثيم الحالي</button>
                    </div>
                    <hr />
                    <p className="small text-muted mb-0">ضع صور الفريمات داخل <code>client/public</code> واكتب المسار مثل <code>/frame-preset3.png</code>.</p>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                {activePreset ? (
                  <>
                    <div className="card border-0 shadow-sm rounded-4 mb-3">
                      <div className="card-body p-4">
                        <h5 className="fw-bold mb-4">بيانات الثيم</h5>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label">اسم الثيم</label>
                            <input className="form-control" value={activePreset.name} onChange={e => updatePreset(activePreset.id, { name: e.target.value })} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">مسار صورة الفريم</label>
                            <input className="form-control" dir="ltr" value={activePreset.frame} onChange={e => updatePreset(activePreset.id, { frame: e.target.value })} />
                          </div>
                          <div className="col-md-6"><NumberField label="تكبير المصحف لهذا الثيم" value={activePreset.quranZoom} step={0.01} onChange={v => updatePreset(activePreset.id, { quranZoom: v })} /></div>
                          <div className="col-md-6">
                            <label className="form-label">لون الخلفية</label>
                            <input className="form-control" dir="ltr" value={activePreset.background ?? '#000000'} onChange={e => updatePreset(activePreset.id, { background: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <RectEditor title="منطقة السلايدر" rectKey="slide" />
                    <RectEditor title="منطقة المصحف" rectKey="page" />
                    <RectEditor title="منطقة معلومات القارئ والسورة" rectKey="info" />
                  </>
                ) : (
                  <div className="card border-0 shadow-sm rounded-4">
                    <div className="card-body p-5 text-center">
                      <h5 className="fw-bold">الثيم الأصلي غير قابل للتعديل من هنا</h5>
                      <p className="text-muted">اضغط إضافة ثيم جديد لإنشاء ثيم ديناميكي قابل للتعديل.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'effects' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">المؤثرات البصرية</h5>
                <div className="row g-3">
                  <div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={config.enableGoldSweep} onChange={e => updateConfig({ enableGoldSweep: e.target.checked })} id="goldSweep" /><label className="form-check-label" htmlFor="goldSweep">لمعة ذهبية</label></div></div>
                  <div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={config.enableParallax} onChange={e => updateConfig({ enableParallax: e.target.checked })} id="parallax" /><label className="form-check-label" htmlFor="parallax">حركة Parallax</label></div></div>
                  <div className="col-md-4"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={config.enableTopDust} onChange={e => updateConfig({ enableTopDust: e.target.checked })} id="dust" /><label className="form-check-label" htmlFor="dust">جزيئات ضوء</label></div></div>
                </div>
              </div>
            </div>
          )}

          {section === 'obs' && (
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">رابط OBS Browser Source</h5>
                    <p className="text-muted">استخدم هذا الرابط داخل OBS كـ Browser Source. هذه الصفحة نظيفة ولا تحتوي على لوحة تحكم.</p>
                    <div className="input-group" dir="ltr">
                      <span className="input-group-text">URL</span>
                      <input className="form-control" readOnly value="http://localhost:5173" />
                    </div>
                    <div className="row g-3 mt-2">
                      <div className="col-6"><div className="p-3 bg-light rounded-4 border"><div className="small text-muted">Width</div><strong>1920</strong></div></div>
                      <div className="col-6"><div className="p-3 bg-light rounded-4 border"><div className="small text-muted">Height</div><strong>1080</strong></div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-dark text-white">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">روابط سريعة</h5>
                    <div className="d-grid gap-2">
                      <a className="btn btn-light" href="/" target="_blank" rel="noreferrer">فتح شاشة البث</a>
                      <a className="btn btn-outline-light" href="/admin" target="_blank" rel="noreferrer">فتح لوحة التحكم</a>
                      <a className="btn btn-outline-light" href="http://localhost:3737/api/layout-presets" target="_blank" rel="noreferrer">عرض ملف الثيمات JSON</a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6"><CommandBox title="تشغيل السيرفر والواجهة معًا" command={'npm run dev'} /></div>
              <div className="col-md-6"><CommandBox title="تشغيل السيرفر فقط" command={'npm run server'} /></div>
              <div className="col-md-6"><CommandBox title="تشغيل واجهة التطوير فقط" command={'npm run client'} /></div>
              <div className="col-md-6"><CommandBox title="بناء نسخة الإنتاج" command={'npm run build'} /></div>
            </div>
          )}

          {section === 'readers' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-5 text-center">
                <h5 className="fw-bold">قسم القرّاء والصوتيات</h5>
                <p className="text-muted mb-0">جاهز للتوسعة في المرحلة القادمة لإضافة مجلدات أصوات القراء وربط كل قارئ بمجلد MP3 مستقل.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
