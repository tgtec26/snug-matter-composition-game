// 화면 전환 뒤 잠깐 입력 무시 (연타 방지)
import { useEffect, useState } from 'react';
export function useLock(ms = 900) {
  const [locked, setLocked] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLocked(false), ms); return () => clearTimeout(t); }, [ms]);
  return locked;
}
