/** 받침 유무로 조사를 고른다 (한글 마지막 글자 기준) */
const jong = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0; };
export const iga = (w: string) => w + (jong(w) ? '이' : '가');
export const eunneun = (w: string) => w + (jong(w) ? '은' : '는');
export const ieyo = (w: string) => w + (jong(w) ? '이에요' : '예요');
