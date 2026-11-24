import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { maxCount } from "@/lib/counter";
import { Counter } from "./counter";

afterEach(cleanup);

describe("Counter", () => {
  it("증가와 초기화", () => {
    render(<Counter />);
    const count = screen.getByTestId("count");
    expect(count.textContent).toBe("0번 눌렀습니다");
    fireEvent.click(screen.getByRole("button", { name: "증가" }));
    fireEvent.click(screen.getByRole("button", { name: "증가" }));
    expect(count.textContent).toBe("2번 눌렀습니다");
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    expect(count.textContent).toBe("0번 눌렀습니다");
  });

  it("최댓값이면 증가 버튼을 끈다", () => {
    render(<Counter start={maxCount} />);
    expect((screen.getByRole("button", { name: "증가" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
