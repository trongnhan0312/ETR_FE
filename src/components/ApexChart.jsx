import { useEffect, useRef } from "react";
import ApexCharts from "apexcharts";

/**
 * Wrapper nhỏ cho ApexCharts (thư viện chart của FreeDash) chạy được với React 19
 * mà không cần react-apexcharts (tránh xung đột peer dependency).
 *
 * - Tạo chart 1 lần khi mount với options ban đầu.
 * - Khi `options` đổi (dữ liệu async load xong) → updateOptions đồng bộ lại.
 * - Hủy chart khi unmount.
 *
 * Props:
 *   @param {object} options - toàn bộ ApexCharts options (bao gồm series, chart.type...)
 *   @param {string} [type]  - override chart type (mặc định lấy options.chart.type)
 *   @param {number|string} [height] - chiều cao chart (px)
 *   @param {string} [width]         - chiều rộng chart
 */
const ApexChart = ({ options, type, height = 300, width = "100%" }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  // Tạo chart khi mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const base = {
      ...(options || {}),
      chart: {
        ...((options || {}).chart || {}),
        type: type || options?.chart?.type || "line",
        height,
        width,
      },
    };
    let chart = null;
    try {
      chart = new ApexCharts(el, base);
      chart.render();
      chartRef.current = chart;
    } catch (err) {
      // Môi trường thiếu API (VD jsdom test) → render thô không lỗi
      console.warn("[ApexChart] render failed:", err);
    }
    return () => {
      try {
        if (chart) chart.destroy();
      } catch {
        /* noop */
      }
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ khi options thay đổi (dữ liệu API load xong)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !options) return;
    try {
      chart.updateOptions(options);
    } catch (err) {
      console.warn("[ApexChart] sync error:", err);
    }
  }, [options]);

  return <div ref={containerRef} style={{ width }} />;
};

export default ApexChart;
