export function startConsultationProgress({reducedMotion, now, requestFrame, onUpdate, onComplete}) {
  if (reducedMotion) {
    onUpdate(100);
    onComplete();
    return;
  }
  const startedAt = now();
  const duration = 1800;
  onUpdate(1);
  function tick(time) {
    const ratio = Math.max(0, Math.min((time - startedAt) / duration, 1));
    onUpdate(Math.min(100, 1 + Math.floor(ratio * 99)));
    if (ratio < 1) requestFrame(tick);
    else onComplete();
  }
  requestFrame(tick);
}
