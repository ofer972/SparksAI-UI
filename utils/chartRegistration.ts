/**
 * Shared Chart.js registration utility
 * Used by all DORA and PR Workflow metric cards
 */
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  LineController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

/**
 * Registers Chart.js components
 * @param includeDataLabels - Whether to include ChartDataLabels plugin (for bar charts with labels)
 */
export function registerChartComponents(includeDataLabels = false) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    LineElement,
    PointElement,
    LineController,
    ScatterController,
    Title,
    Tooltip,
    Legend,
    ...(includeDataLabels ? [ChartDataLabels] : [])
  );
}




