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

  const initOrUpdate = () => {
    const el = containerRef.current;
    if (!el || !options) return;

    const merged = {
      ...(options || {}),
      chart: {
        ...((options || {}).chart || {}),
        type: type || options?.chart?.type || "line",
        height,
        width,
      },
    };

    if (!chartRef.current) {
      try {
        const chart = new ApexCharts(el, merged);
        chart.render();
        chartRef.current = chart;
      } catch (err) {
        console.warn("[ApexChart] render failed:", err);
      }
    } else {
      try {
        chartRef.current.updateOptions(merged, true, true);
      } catch (err) {
        // If update failed (e.g. SVG element destroyed), re-create chart
        try {
          chartRef.current.destroy();
        } catch {
          /* noop */
        }
        try {
          const chart = new ApexCharts(el, merged);
          chart.render();
          chartRef.current = chart;
        } catch (e) {
          console.warn("[ApexChart] re-render failed:", e);
        }
      }
    }
  };

  useEffect(() => {
    initOrUpdate();
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {
          /* noop */
        }
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, type, height, width]);

  const minH = typeof height === "number" ? `${height}px` : height;

  return <div ref={containerRef} style={{ width, minHeight: minH, display: "block" }} />;
};

export default ApexChart;
