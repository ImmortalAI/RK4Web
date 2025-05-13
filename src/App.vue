<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import { useTheme } from '@/composables/useTheme';
import { DormandPrinceSolver } from '@/utils/rkdp';
import type { Range, SolutionPoint } from '@/utils/rkdp';
import type { ChartDataProp, ChartOptionsProp } from '@/types/chart';
import { downloadCSV } from '@/utils/downloaderCSV';

const theme = useTheme();
const bodyStyles = window.getComputedStyle(document.body);

const rkdpProvider = reactive<DormandPrinceSolver>(new DormandPrinceSolver());
const range = ref<Range>({ start: 0, end: 1, initialStep: 0.1 });

const saveDialogVisible = ref(false);

onMounted(() => {
  addInput('y_1=y_0+5 x');

  solveTaskResult.value = [
    { x: 0, y: 0 },
    { x: 0.1, y: 0.026 },
    { x: 0.272, y: 0.204 },
    { x: 0.442, y: 0.57 },
    { x: 0.606, y: 1.137 },
    { x: 0.769, y: 1.944 },
    { x: 0.945, y: 3.135 },
    { x: 1, y: 3.591 },
  ];
});

interface MathInputItem {
  id: number;
  value: string;
}

const mathinputFieldsData = ref<MathInputItem[]>([]);
let idCounter = 0;

function addInput(initialEq?: string) {
  mathinputFieldsData.value.push({ id: idCounter++, value: initialEq || '' });
}

function removeInput(index: number) {
  mathinputFieldsData.value.splice(index, 1);
}

watch(
  mathinputFieldsData,
  () => {
    try {
      rkdpProvider.addEquations(
        mathinputFieldsData.value.map((field) => {
          return field.value;
        }),
      );
    } catch (e) {
      console.error(e);
    }
  },
  { deep: true },
);

const initialConditions = reactive<Record<string, number>>({});

const unsubscribeUpdateEq = rkdpProvider.subscribe('equationsUpdated', () => {
  Object.keys(initialConditions).forEach((key) => delete initialConditions[key]);
  rkdpProvider.getVariableNames().forEach((varName) => {
    initialConditions[varName] = 0;
  });
});

watch(initialConditions, (newConditions) => {
  rkdpProvider.setInitialConditions(newConditions);
});

watch(
  range,
  (newVal) => {
    rkdpProvider.setRange(newVal.start, newVal.end, newVal.initialStep);
  },
  { deep: true },
);

const solveTaskResult = ref<SolutionPoint[]>([]);

const isAdaptiveStep = ref(false);
const startSolve = async () => {
  await rkdpProvider.calculate(isAdaptiveStep.value);
};

const calculateButtonDisabled = ref(false);
const unsubCalculateStart = rkdpProvider.subscribe('calculationStarted', () => {
  calculateButtonDisabled.value = true;
});

const unsubCalculateProgress = rkdpProvider.subscribe('calculationProgress', (o) => console.log(o));

const unsubscribeCalculateComplete = rkdpProvider.subscribe(
  'calculationCompleted',
  (result: SolutionPoint[]) => {
    solveTaskResult.value = result;
    calculateButtonDisabled.value = false;
  },
);

watch(solveTaskResult, (newValue) => {
  chartData.value.datasets = [];
  Object.keys(newValue[0]).forEach((key) => {
    if (key == 'x') return;
    chartData.value.datasets.push({
      label: 'График оси ' + key,
      data: newValue.map((point) => {
        return { x: point.x, y: point[key] };
      }),
      fill: false,
      tension: 0.1,
    });
  });
});

const chartData = ref<ChartDataProp>({
  datasets: [
    {
      label: 'Пример',
      data: [],
      backgroundColor: 'rgba(75, 192, 192, 0.4)',
      borderColor: 'rgba(75, 192, 192, 1)',
      fill: false,
      tension: 0.1,
    },
  ],
});

const chartOptions = ref<ChartOptionsProp>({
  responsive: true,
  maintainAspectRatio: false,

  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      title: {
        display: true,
        text: 'X value',
      },
      ticks: {
        color: bodyStyles.getPropertyValue('--p-surface-500'),
      },
      grid: {
        color: bodyStyles.getPropertyValue('--p-surface-400'),
      },
    },
    y: {
      title: {
        display: true,
        text: 'Y value',
      },
      ticks: {
        color: bodyStyles.getPropertyValue('--p-surface-500'),
      },
      grid: {
        color: bodyStyles.getPropertyValue('--p-surface-400'),
      },
    },
  },

  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    title: {
      display: true,
      text: 'График решения дифференциальных уравнений',
    },
  },
});

const chartRef = ref();
function downloadChart() {
  const chartInstance = chartRef.value?.chart;
  if (!chartInstance) return;

  const base64Image = chartInstance.toBase64Image();

  const link = document.createElement('a');
  link.href = base64Image;
  link.download = 'chart.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

onUnmounted(() => {
  unsubscribeUpdateEq();
  unsubCalculateStart();
  unsubCalculateProgress();
  unsubscribeCalculateComplete();
});
</script>

<template>
  <header class="flex justify-between items-center p-2 pl-4 pr-4 m-2 border-2 rounded-3xl border-surface-600">
    <p>Дорманд-Принс построитель</p>
    <ToggleButton
      v-model="theme.isDark.value"
      off-label="Светлый"
      off-icon="pi pi-sun"
      on-label="Темный"
      on-icon="pi pi-moon"
    />
  </header>
  <main class="flex justify-center items-start flex-col md:flex-row gap-4 p-4">
    <div class="md:basis-1/3 flex flex-col">
      <Card>
        <template #title> Дифференциальные уравнения </template>
        <template #content>
          <div
            class="flex items-center gap-2 border border-primary rounded-xl p-2 m-2"
            v-for="(input, index) in mathinputFieldsData"
            :key="index"
          >
            <MathLiveInput
              class="w-full"
              v-model="input.value"
              :dark="theme.isDark.value"
              format="ascii"
            />
            <Button icon="pi pi-minus" severity="danger" @click="removeInput(index)" />
          </div>
          <Button icon="pi pi-plus" @click="addInput()" class="w-full!" />
        </template>
      </Card>
      <Divider></Divider>
      <Card>
        <template #title>Начальные условия</template>
        <template #content>
          <div class="flex flex-col">
            <div
              v-for="(value, key) in initialConditions"
              :key="key"
              class="flex gap-2 items-center mb-1"
            >
              <label :for="'for-' + key" class="whitespace-nowrap">{{ key }}(x) =</label>
              <InputNumber
                v-model="initialConditions[key]"
                :input-id="'for-' + key"
                :maxFractionDigits="6"
                class="w-full"
              ></InputNumber>
            </div>
          </div>
        </template>
      </Card>
      <Divider></Divider>
      <Card>
        <template #title>Диапазон расчета</template>
        <template #content>
          <div class="flex flex-col gap-8 mt-8">
            <FloatLabel>
              <InputNumber
                v-model="range.start"
                input-id="fromX"
                :maxFractionDigits="3"
                class="w-full"
              ></InputNumber>
              <label for="fromX">Рассчитать от</label>
            </FloatLabel>
            <FloatLabel>
              <InputNumber
                v-model="range.end"
                input-id="toX"
                :maxFractionDigits="3"
                class="w-full"
              ></InputNumber>
              <label for="toX">Рассчитать до</label>
            </FloatLabel>
            <FloatLabel>
              <InputNumber
                v-model="range.initialStep"
                input-id="step"
                :minFractionDigits="1"
                :maxFractionDigits="6"
                class="w-full"
              ></InputNumber>
              <label for="step">Шаг</label>
            </FloatLabel>
            <div class="flex items-center justify-between">
              <label for="adaptiveSwitch">Адаптивный шаг</label>
              <ToggleSwitch v-model="isAdaptiveStep"></ToggleSwitch>
            </div>
          </div>
        </template>
      </Card>
      <div class="p-2"></div>
      <Button label="Рассчитать" @click="startSolve" :disabled="calculateButtonDisabled" />
      <Divider></Divider>
      <Button label="Загрузить результат" @click="saveDialogVisible = true" />
    </div>
    <div class="md:basis-2/3 border border-surface-400">
      <Chart
        type="line"
        :data="chartData"
        :options="chartOptions"
        class="h-[80vh]"
        ref="chartRef"
      ></Chart>
    </div>
  </main>
  <Dialog
    v-model:visible="saveDialogVisible"
    header="Выберите способ сохранения"
    position="bottomleft"
    modal
  >
    <div class="flex flex-col gap-2 m-2">
      <Button label="Загрузить как CSV" @click="downloadCSV([...solveTaskResult])" />
      <Button label="Загрузить как изображение" @click="downloadChart"></Button>
    </div>
  </Dialog>
</template>
