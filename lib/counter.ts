// 카운터의 도메인 로직. 화면(React)과 분리해 단위 테스트로 검증한다.

export const initialCount = 0;
export const maxCount = 99;

export function increment(count: number): number {
  return Math.min(count + 1, maxCount);
}

export function reset(): number {
  return initialCount;
}

export function countLabel(count: number): string {
  return `${count}번 눌렀습니다`;
}
