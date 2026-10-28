import React, { useState } from 'react';
import { AppData, AutoBackupSnapshot } from '../types';
import { downloadJsonFile, exportProductsToCsv, exportSalesToCsv, getAutoBackups, validateBackupJson } from '../utils/storage';
import { $, today, nowTime } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Copy, Download, FileSpreadsheet, FileText, History, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';

interface BackupModalProps {
  data: AppData;
  isOpen: boolean;
  onClose: () => void;
  onRestoreData: (restoredData: AppData, reason: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  data,
  isOpen,
  onClose,
  onRestoreData,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'auto' | 'text'>('export');
  const [manualText, setManualText] = useState<string>('');
  const [previewData, setPreviewData] = useState<{
    data: AppData;
    counts: { products: number; sales: number; purchases: number; shifts: number; cash: number };
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const autoBackups = getAutoBackups();

  const handleDownload = () => {
    downloadJsonFile(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setPreviewData(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const val = validateBackupJson(content);
      if (val.valid && val.data && val.counts) {
        setPreviewData({ data: val.data, counts: val.counts });
      } else {
        setFileError(val.error || 'El archivo seleccionado no es válido.');
      }
    };
    reader.onerror = () => setFileError('Error al leer el archivo en el navegador.');
    reader.readAsText(file);
  };

  const handleManualTextValidate = () => {
    setFileError(null);
    setPreviewData(null);
    if (!manualText.trim()) {
      setFileError('Pegá primero el texto de la copia de seguridad.');
      return;
    }
    const val = validateBackupJson(manualText);
    if (val.valid && val.data && val.counts) {
      setPreviewData({ data: val.data, counts: val.counts });
    } else {
      setFileError(val.error || 'El texto pegado no es un JSON válido.');
    }
  };

  const handleConfirmRestore = () => {
    if (!previewData) return;
    const confirmMsg = `¿Confirmás restaurar esta copia con ${previewData.counts.products} productos y ${previewData.counts.sales} ventas? Se creará automáticamente un respaldo previo de tus datos actuales.`;
    if (!window.confirm(confirmMsg)) return;

    onRestoreData(previewData.data, 'Restauración manual confirmada');
    setPreviewData(null);
    onClose();
  };

  const handleRestoreAuto = (snapshot: AutoBackupSnapshot) => {
    const confirmMsg = `¿Restaurar la copia automática del ${snapshot.dateStr} (${snapshot.reason})? Contiene ${snapshot.summary.productCount} productos y ${snapshot.summary.saleCount} ventas.`;
    if (!window.confirm(confirmMsg)) return;

    onRestoreData(snapshot.data, `Restauración de copia automática: ${snapshot.reason}`);
    onClose();
  };

  const handleCopyClipboard = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data));
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch (e) {
      alert('No se pudo copiar automáticamente. Podés seleccionarlo manualmente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Copias de Seguridad Reforzadas</h2>
              <p className="text-xs text-stone-300">
                Protegé tus datos contra pérdida o cambios de computadora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'export'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Download className="w-4 h-4 text-orange-600" />
            Descargar
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'restore'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            Restaurar Archivo
          </button>
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'auto'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            Copias Auto ({autoBackups.length})
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'text'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            Texto JSON
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* TAB 1: DESCARGAR ARCHIVOS */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-950">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  Descargar Copia Completa del Sistema
                </h4>
                <p className="text-xs text-orange-800 leading-relaxed">
                  Descargá un archivo <b>.json</b> con todos tus productos, precios, ventas históricas, clientes con deuda, compras a proveedores y turnos de caja. Podés guardarlo en tu computadora, pendrive o enviártelo por mail/WhatsApp.
                </p>
                <div className="mt-3.5">
                  <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Archivo de Copia (.json)
                  </button>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Exportar Datos Legibles a Excel / CSV
                </h4>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => exportProductsToCsv(data.products)}
                    className="p-3 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between"
                  >
                    <div>
                      <strong className="block text-sm text-stone-900">Catálogo de Productos</strong>
                      <span className="text-xs text-stone-500">
                        {data.products.length} productos con stock y precios
                      </span>
                    </div>
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  </button>

                  <button
                    onClick={() => exportSalesToCsv(data.sales)}
                    className="p-3 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between"
                  >
                    <div>
                      <strong className="block text-sm text-stone-900">Historial de Ventas</strong>
                      <span className="text-xs text-stone-500">
                        {data.sales.length} ventas con totales y deudas
                      </span>
                    </div>
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURAR DESDE ARCHIVO */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm">
                <strong className="block font-bold mb-1">
                  Restaurar desde archivo de copia (.json)
                </strong>
                Seleccioná el archivo que descargaste previamente. Antes de aplicar los cambios, verás un resumen con la cantidad exacta de productos y ventas que contiene.
              </div>

              {/* File upload input */}
              <div className="border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer bg-stone-50 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-input"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer block">
                  <Upload className="w-10 h-10 mx-auto text-stone-400 mb-2" />
                  <span className="block font-bold text-stone-800 text-sm">
                    Hacé clic acá para seleccionar tu archivo de copia (.json)
                  </span>
                  <span className="block text-xs text-stone-500 mt-1">
                    Solo archivos de copia válidos de Veterinaria Mascotas
                  </span>
                </label>
              </div>

              {fileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {fileError}
                </div>
              )}

              {/* Preview card before confirming restore */}
              {previewData && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ¡Copia válida lista para restaurar!
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 text-center">
                      <span className="text-stone-500 block">Productos</span>
                      <b className="text-base text-stone-900">{previewData.counts.products}</b>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 text-center">
                      <span className="text-stone-500 block">Ventas</span>
                      <b className="text-base text-stone-900">{previewData.counts.sales}</b>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 text-center">
                      <span className="text-stone-500 block">Compras</span>
                      <b className="text-base text-stone-900">{previewData.counts.purchases}</b>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 text-center">
                      <span className="text-stone-500 block">Turnos Caja</span>
                      <b className="text-base text-stone-900">{previewData.counts.shifts}</b>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    ⚠️ <b>Aviso de seguridad:</b> El sistema creará una copia automática de respaldo de los datos actuales antes de restaurar, por lo que nunca perderás información accidentalmente.
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRestore}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      Confirmar y Restaurar Datos Ahora
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COPIAS AUTOMÁTICAS RECIENTES */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm">
                <strong className="block font-bold mb-0.5">
                  Protección Continua: Puntos de Restauración Automáticos
                </strong>
                El sistema guarda instantáneas de seguridad de forma periódica en tu navegador (por ejemplo antes de cada cierre de caja o modificación masiva) para que puedas volver atrás con un solo clic si ocurre un error.
              </div>

              {autoBackups.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">
                  <History className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                  Todavía no hay copias automáticas guardadas en este navegador.
                </div>
              ) : (
                <div className="space-y-2">
                  {autoBackups.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900 font-bold">{snap.reason}</strong>
                          <span className="text-stone-500 text-xs">{snap.dateStr}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {snap.summary.productCount} productos · {snap.summary.saleCount} ventas · {snap.summary.shiftCount} turnos
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreAuto(snap)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restaurar este punto
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEXTO JSON MANUAL */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-600">
                Podés copiar el texto completo para guardarlo en un bloc de notas o pegarlo acá para restaurar:
              </p>
              <textarea
                rows={6}
                value={manualText || JSON.stringify(data)}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-orange-500 focus:outline-hidden"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copiedSuccess ? '✔ ¡Copiado al portapapeles!' : 'Copiar todo el texto'}
                </button>
                <button
                  type="button"
                  onClick={handleManualTextValidate}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar y Restaurar desde Texto
                </button>
              </div>

              {fileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {fileError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
