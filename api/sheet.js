// api/sheet.js — server-side bridge to your Google Sheet.
// Runs on Vercel (no sandbox, no CORS), so it can reach Apps Script.
// Your /exec URL and token are baked in below; you can also override them
// with Vercel Environment Variables SHEET_URL and SHEET_TOKEN if you prefer.

const DEFAULT_EXEC_URL =
  "https://script.google.com/macros/s/AKfycbx76rNtPFVreh083xwP9kZ9syRUnnxdcxAWx39eAy4HUHE-0OEf0Bo97JSxIrrUwD5n/exec";
const DEFAULT_TOKEN = "rfr_7Qk2Lp9XmZ4";

module.exports = async (req, res) => {
  const execUrl = process.env.SHEET_URL || DEFAULT_EXEC_URL;
  const token = process.env.SHEET_TOKEN || DEFAULT_TOKEN;

  try {
    const q = req.query || {};
    const action = String(q.action || "all");

    const params = new URLSearchParams();
    params.set("token", token);
    params.set("action", action);
    params.set("callback", "cb"); // the Apps Script always replies as cb({...})
    if (action === "set") {
      params.set("date", String(q.date || ""));
      params.set("radiology", String(q.radiology || "0"));
      params.set("specialist", String(q.specialist || "0"));
    }

    const r = await fetch(`${execUrl}?${params.toString()}`, { redirect: "follow" });
    const text = await r.text();

    // Unwrap JSONP: cb({...}) -> {...}
    let jsonStr = text.trim();
    const open = jsonStr.indexOf("(");
    const close = jsonStr.lastIndexOf(")");
    if (open !== -1 && close > open) jsonStr = jsonStr.slice(open + 1, close);

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: "Unexpected reply from sheet",
        hint: text.slice(0, 160),
      });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
