import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(startDateParam: string | null, endDateParam: string | null) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const rawStart = parseDateParam(startDateParam) || defaultStart;
  const rawEnd = parseDateParam(endDateParam) || defaultEnd;

  const start = rawStart <= rawEnd ? rawStart : rawEnd;
  const end = rawStart <= rawEnd ? rawEnd : rawStart;

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const startText = formatDateParam(start);
  const endText = formatDateParam(end);

  return {
    startText,
    endText,
    filePeriod: `${startText}_sampai_${endText}`,
  };
}

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || url.host;
  const protocol = forwardedProto || url.protocol.replace(":", "");

  return `${protocol}://${host}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const { startText, endText, filePeriod } = getDateRange(
    searchParams.get("startDate"),
    searchParams.get("endDate")
  );

  const baseUrl = getBaseUrl(req);
  const reportUrl = `${baseUrl}/admin/laporan/print?startDate=${startText}&endDate=${endText}`;

  const cookieHeader = req.headers.get("cookie") || "";

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    if (cookieHeader) {
      await page.setExtraHTTPHeaders({
        cookie: cookieHeader,
      });
    }

    await page.setViewport({
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1,
    });

    await page.goto(reportUrl, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    const currentUrl = page.url();

    if (currentUrl.includes("/login")) {
      throw new Error(
        "Puppeteer diarahkan ke halaman login. Cookie login tidak terbaca."
      );
    }

    await page.emulateMediaType("print");

    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
      preferCSSPageSize: true,
    });

    const pdfBuffer = Buffer.from(pdfUint8Array);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-periode-${filePeriod}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Gagal membuat PDF laporan:", error);

    return NextResponse.json(
      {
        message: "Gagal membuat PDF laporan.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}