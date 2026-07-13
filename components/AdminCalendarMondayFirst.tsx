"use client";

import { useEffect } from "react";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseISO(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function createNeutralCell(date: Date) {
  const cell = document.createElement("div");
  cell.className =
    "rounded-xl border border-white/5 bg-black/10 px-2 py-3 text-center text-sm text-white/25";
  cell.title = formatISO(date);
  cell.textContent = String(date.getDate());
  return cell;
}

function findOriginalDateGrid() {
  const grids = Array.from(
    document.querySelectorAll<HTMLElement>(".grid.grid-cols-7")
  );

  return (
    grids.find((grid) => {
      if (grid.dataset.adminCalendarMondayFirst) return false;

      const children = Array.from(grid.children) as HTMLElement[];
      return (
        children.length >= 28 &&
        children.length % 7 === 0 &&
        children.every((child) => ISO_DATE.test(child.title || ""))
      );
    }) ?? null
  );
}

function renderMondayFirstCalendar() {
  if (window.location.pathname !== "/admin") return;

  const dateGrid = findOriginalDateGrid();
  if (!dateGrid) return;

  const headerGrid = dateGrid.previousElementSibling as HTMLElement | null;
  if (!headerGrid || !headerGrid.classList.contains("grid-cols-7")) return;

  const originalCells = Array.from(dateGrid.children) as HTMLElement[];
  const firstInMonth = originalCells.find(
    (cell) => !cell.className.includes("text-white/25")
  );

  if (!firstInMonth || !ISO_DATE.test(firstInMonth.title)) return;

  const selectedDate = parseISO(firstInMonth.title);
  const year = selectedDate.getFullYear();
  const monthIndex = selectedDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - mondayOffset);

  const sundayOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1) % 7;
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(gridEnd.getDate() + sundayOffset);

  const originalByDate = new Map(
    originalCells.map((cell) => [cell.title, cell] as const)
  );

  const wrapper = document.createElement("div");
  wrapper.dataset.adminCalendarMondayFirst = "wrapper";
  wrapper.className = "mt-4";

  const newHeader = document.createElement("div");
  newHeader.dataset.adminCalendarMondayFirst = "header";
  newHeader.className =
    "grid grid-cols-7 gap-2 text-center text-xs text-white/50";

  for (const weekday of WEEKDAYS) {
    const label = document.createElement("div");
    label.textContent = weekday;
    newHeader.appendChild(label);
  }

  const newDateGrid = document.createElement("div");
  newDateGrid.dataset.adminCalendarMondayFirst = "dates";
  newDateGrid.className = "mt-2 grid grid-cols-7 gap-2";

  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const iso = formatISO(cursor);
    const original = originalByDate.get(iso);
    const cell = original
      ? (original.cloneNode(true) as HTMLElement)
      : createNeutralCell(cursor);

    cell.removeAttribute("data-admin-calendar-monday-first");
    newDateGrid.appendChild(cell);
    cursor.setDate(cursor.getDate() + 1);
  }

  wrapper.append(newHeader, newDateGrid);

  const existing = dateGrid.parentElement?.querySelector<HTMLElement>(
    '[data-admin-calendar-monday-first="wrapper"]'
  );
  existing?.remove();

  headerGrid.style.display = "none";
  headerGrid.setAttribute("aria-hidden", "true");
  dateGrid.style.display = "none";
  dateGrid.setAttribute("aria-hidden", "true");
  dateGrid.insertAdjacentElement("afterend", wrapper);
}

export default function AdminCalendarMondayFirst() {
  useEffect(() => {
    let frame = 0;

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        observer.disconnect();
        renderMondayFirstCalendar();
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    });

    renderMondayFirstCalendar();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document
        .querySelectorAll<HTMLElement>("[data-admin-calendar-monday-first]")
        .forEach((element) => element.remove());
      document
        .querySelectorAll<HTMLElement>(".grid.grid-cols-7[aria-hidden='true']")
        .forEach((element) => {
          element.style.removeProperty("display");
          element.removeAttribute("aria-hidden");
        });
    };
  }, []);

  return null;
}
