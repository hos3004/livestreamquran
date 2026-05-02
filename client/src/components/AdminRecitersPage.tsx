import React, { useEffect, useState } from 'react';
import type { Reciter, RecitersFile } from '../types';

interface ScannedFolder {
  folderName: string;
  audioDir: string;
}

const emptyData: RecitersFile = {
  audioRootDir: '',
  activeReciterId: '',
  reciters: [],
};

const makeId = (name: string, index: number) => {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `reciter-${index}`;
};

export const AdminRecitersPage: React.FC = () => {
  const [data, setData] = useState<RecitersFile>(emptyData);
  const [folders, setFolders] = useState<ScannedFolder[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reciters');
      const json = await res.json();
      setData({ ...emptyData, ...json });
    } catch (error) {
      setStatus(`تعذر تحميل بيانات القراء: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (next: RecitersFile) => {
    setData(next);
    const res = await fetch('/api/reciters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    setData({ audioRootDir: json.audioRootDir, activeReciterId: json.activeReciterId, reciters: json.reciters });
    return json;
  };

  const scanFolders = async () => {
    setStatus('جاري فحص مجلد القراء...');
    try {
      const res = await fetch('/api/reciters/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioRootDir: data.audioRootDir }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scan failed');
      setFolders(json.folders || []);
      setStatus(`تم العثور على ${json.folders?.length || 0} مجلد.`);
    } catch (error) {
      setStatus(`فشل الفحص: ${(error as Error).message}`);
    }
  };

  const addFromFolder = async () => {
    const folder = folders.find(item => item.folderName === selectedFolder);
    if (!folder) {
      setStatus('اختر مجلدًا أولًا.');
      return;
    }
    const name = newName.trim() || folder.folderName;
    const id = makeId(name, data.reciters.length + 1);
    const reciter: Reciter = {
      id,
      name,
      folderName: folder.folderName,
      audioDir: folder.audioDir,
    };
    try {
      await save({ ...data, activeReciterId: data.activeReciterId || id, reciters: [...data.reciters, reciter] });
      setNewName('');
      setSelectedFolder('');
      setStatus('تمت إضافة القارئ وحفظه.');
    } catch (error) {
      setStatus(`فشل الحفظ: ${(error as Error).message}`);
    }
  };

  const updateReciter = async (id: string, patch: Partial<Reciter>) => {
    const next = { ...data, reciters: data.reciters.map(r => r.id === id ? { ...r, ...patch } : r) };
    try {
      await save(next);
      setStatus('تم الحفظ.');
    } catch (error) {
      setStatus(`فشل الحفظ: ${(error as Error).message}`);
    }
  };

  const deleteReciter = async (id: string) => {
    const nextList = data.reciters.filter(r => r.id !== id);
    const nextActive = data.activeReciterId === id ? (nextList[0]?.id || '') : data.activeReciterId;
    try {
      await save({ ...data, activeReciterId: nextActive, reciters: nextList });
      setStatus('تم حذف القارئ.');
    } catch (error) {
      setStatus(`فشل الحذف: ${(error as Error).message}`);
    }
  };

  const activateReciter = async (id: string) => {
    setStatus('جاري تفعيل القارئ...');
    try {
      const res = await fetch('/api/reciters/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Activation failed');
      setData({ audioRootDir: json.reciters.audioRootDir, activeReciterId: json.reciters.activeReciterId, reciters: json.reciters.reciters });
      setStatus(`تم تفعيل القارئ: ${json.reciter.name}. أعد تشغيل ingest إذا كانت الملفات مختلفة.`);
    } catch (error) {
      setStatus(`فشل التفعيل: ${(error as Error).message}`);
    }
  };

  return (
    <div className="admin-dashboard" dir="rtl">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🎙️</div>
          <div>
            <h1>القرّاء</h1>
            <p>Reciters Library</p>
          </div>
        </div>
        <nav className="admin-nav">
          <a className="admin-nav-link" href="/admin"><span>⚙️</span><span>لوحة التحكم</span></a>
          <a className="admin-nav-link active" href="/admin/reciters"><span>🎙️</span><span>القرّاء والصوتيات</span></a>
          <a className="admin-nav-link" href="/admin/player"><span>▶️</span><span>Player</span></a>
          <a className="admin-nav-link" href="/" target="_blank" rel="noreferrer"><span>📺</span><span>OBS</span></a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h2 className="mb-1">إدارة القرّاء ومجلدات الصوت</h2>
            <p className="text-muted mb-0">اختر مجلدًا رئيسيًا يحتوي مجلدًا لكل قارئ، ثم اربط كل قارئ بمجلده.</p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <a className="btn btn-dark rounded-pill px-4" href="/admin">لوحة التحكم</a>
            <a className="btn btn-primary rounded-pill px-4" href="/player" target="_blank" rel="noreferrer">Player</a>
          </div>
        </header>

        <section className="admin-content">
          {loading ? (
            <div className="card border-0 shadow-sm rounded-4"><div className="card-body p-5 text-center">جاري التحميل...</div></div>
          ) : (
            <div className="row g-4">
              <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">المجلد الرئيسي للقراء</h5>
                    <label className="form-label">مسار المجلد الرئيسي</label>
                    <input
                      className="form-control mb-3"
                      dir="ltr"
                      value={data.audioRootDir}
                      onChange={e => setData({ ...data, audioRootDir: e.target.value })}
                      placeholder="D:/2025 apps/quran/reciters"
                    />
                    <div className="d-grid gap-2">
                      <button className="btn btn-primary" onClick={scanFolders}>فحص المجلدات</button>
                      <button className="btn btn-outline-primary" onClick={() => save(data).then(() => setStatus('تم حفظ مسار المجلد الرئيسي.')).catch(e => setStatus(e.message))}>حفظ المسار</button>
                    </div>
                    <p className="small text-muted mt-3 mb-0">مثال: داخل المجلد الرئيسي يكون لديك مجلدات مثل maher و sudais و husary.</p>
                  </div>
                </div>

                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">إضافة قارئ من مجلد</h5>
                    <label className="form-label">المجلد</label>
                    <select className="form-select mb-3" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
                      <option value="">اختر مجلدًا</option>
                      {folders.map(folder => <option key={folder.audioDir} value={folder.folderName}>{folder.folderName}</option>)}
                    </select>
                    <label className="form-label">اسم القارئ المعروض</label>
                    <input className="form-control mb-3" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: ماهر المعيقلي" />
                    <button className="btn btn-success w-100" onClick={addFromFolder}>إضافة القارئ</button>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                      <h5 className="fw-bold mb-0">قائمة القرّاء</h5>
                      <span className="badge rounded-pill text-bg-light border">{data.reciters.length} قارئ</span>
                    </div>

                    {data.reciters.length === 0 ? (
                      <div className="text-center text-muted p-5">لا يوجد قرّاء بعد. افحص المجلد الرئيسي ثم أضف قارئًا.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead>
                            <tr>
                              <th>الحالة</th>
                              <th>اسم القارئ</th>
                              <th>المجلد</th>
                              <th>المسار</th>
                              <th>إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.reciters.map(reciter => (
                              <tr key={reciter.id}>
                                <td>{data.activeReciterId === reciter.id ? <span className="badge text-bg-success">نشط</span> : <span className="badge text-bg-secondary">غير نشط</span>}</td>
                                <td><input className="form-control" value={reciter.name} onChange={e => updateReciter(reciter.id, { name: e.target.value })} /></td>
                                <td><input className="form-control" dir="ltr" value={reciter.folderName} onChange={e => updateReciter(reciter.id, { folderName: e.target.value })} /></td>
                                <td><input className="form-control" dir="ltr" value={reciter.audioDir} onChange={e => updateReciter(reciter.id, { audioDir: e.target.value })} /></td>
                                <td>
                                  <div className="d-flex gap-2 flex-wrap">
                                    <button className="btn btn-sm btn-primary" onClick={() => activateReciter(reciter.id)}>تفعيل</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteReciter(reciter.id)}>حذف</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {status && <div className="alert alert-info mt-3 mb-0">{status}</div>}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
