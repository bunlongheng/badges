import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "@/components/DropZone";
import { Controls } from "@/components/Controls";
import { ImageTray } from "@/components/ImageTray";
import { DEFAULT_SETTINGS } from "@/lib/presets";

describe("DropZone", () => {
  it("forwards selected files to onFiles", async () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "a.png", { type: "image/png" });
    await userEvent.upload(input, file);
    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it("is keyboard reachable", () => {
    render(<DropZone onFiles={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });
});

describe("Controls", () => {
  it("updates shape when a segmented option is clicked", async () => {
    const update = vi.fn();
    render(
      <Controls settings={DEFAULT_SETTINGS} update={update} reset={vi.fn()} maxCols={4} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Circle" }));
    expect(update).toHaveBeenCalledWith("shape", "circle");
  });

  it("toggles repeat", async () => {
    const update = vi.fn();
    render(
      <Controls settings={DEFAULT_SETTINGS} update={update} reset={vi.fn()} maxCols={4} />
    );
    await userEvent.click(screen.getByText("Repeat to fill page"));
    expect(update).toHaveBeenCalledWith("repeat", true);
  });

  it("calls reset", async () => {
    const reset = vi.fn();
    render(
      <Controls settings={DEFAULT_SETTINGS} update={vi.fn()} reset={reset} maxCols={4} />
    );
    await userEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(reset).toHaveBeenCalled();
  });
});

describe("ImageTray", () => {
  const imgs = [
    { id: "1", url: "blob:1", name: "one" },
    { id: "2", url: "blob:2", name: "two" },
  ];

  it("renders nothing when empty", () => {
    const { container } = render(
      <ImageTray images={[]} onRemove={vi.fn()} onMove={vi.fn()} onClear={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("removes an image", async () => {
    const onRemove = vi.fn();
    render(
      <ImageTray images={imgs} onRemove={onRemove} onMove={vi.fn()} onClear={vi.fn()} />
    );
    const removeButtons = screen.getAllByLabelText("Remove image");
    await userEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("clears all", async () => {
    const onClear = vi.fn();
    render(
      <ImageTray images={imgs} onRemove={vi.fn()} onMove={vi.fn()} onClear={onClear} />
    );
    await userEvent.click(screen.getByText("Clear all"));
    expect(onClear).toHaveBeenCalled();
  });
});
