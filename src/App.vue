<script setup lang="ts">
// #region Ext Libs Imports
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { all, create } from 'mathjs';
// #endregion

// #region Local Imports
import { useTheme } from '@/composables/useTheme';
import { DormandPrinceSolver } from '@/utils/rkdp';
import type { SolutionPoint } from '@/utils/rkdp';
import type { ChartDataProp, ChartOptionsProp } from '@/types/chart';
import { downloadCSV } from '@/utils/downloaderCSV';
// #endregion

// #region Theming
const theme = useTheme();
const bodyStyles = window.getComputedStyle(document.body);
// #endregion

// #region ODE Solver
const rkdpProvider = reactive<DormandPrinceSolver>(new DormandPrinceSolver());
// #endregion

// #region Initial State
const mathInst = create(all);

onMounted(() => {
  addInput();

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
// #endregion

// #region ODE Input
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
  (newInputData) => {
    console.log(newInputData);
    try {
      rkdpProvider.addEquations(
        newInputData.map((field) => {
          return field.value;
        }),
      );
    } catch (e) {
      console.error(e);
    }
  },
  { deep: true },
);
// #endregion

// #region Initial Conditions
const initialConditions = reactive<Record<string, string>>({});

const convertIC = (value: string) =>
  value.replace(/_([0-9]+)$/, (match, num) => {
    return "'".repeat(+num);
  });

const unsubscribeUpdateEq = rkdpProvider.on('equationsUpdated', () => {
  Object.keys(initialConditions).forEach((key) => delete initialConditions[key]);
  rkdpProvider.getVariableNames().forEach((varName) => {
    initialConditions[varName] = '';
  });
});

watch(initialConditions, (newConditions) => {
  const newConditionsObj: Record<string, number> = {};
  Object.keys(newConditions).forEach((key) => {
    newConditionsObj[key] = mathInst.evaluate(newConditions[key]);
  });
  rkdpProvider.setInitialConditions(newConditionsObj);
});
// #endregion

// #region Range
const range = ref({ start: '0', end: '1', initialStep: '0.1', varName: 'x' });
watch(
  range,
  (newVal) => {
    chartOptions.scales!.x!.title!.text = newVal.varName.toUpperCase() + ' value';
    try {
      rkdpProvider.setRange(
        newVal.varName,
        mathInst.evaluate(newVal.start),
        mathInst.evaluate(newVal.end),
        mathInst.evaluate(newVal.initialStep),
      );
    } catch (e) {
      console.error(e);
    }
  },
  { deep: true },
);
// #endregion

// #region Solve
const solveTaskResult = ref<SolutionPoint[]>([]);

const isAdaptiveStep = ref(false);
const calculationPromise = ref<Promise<SolutionPoint[]> | null>(null);
const startSolve = () => {
  calculationPromise.value = rkdpProvider.calculate(isAdaptiveStep.value);
};

const calculateButtonDisabled = ref(false);
const unsubCalculateStart = rkdpProvider.on('calculationStarted', () => {
  calculateButtonDisabled.value = true;
});

const unsubCalculateProgress = rkdpProvider.on('calculationProgress', (o) => console.log(o));

const unsubscribeCalculateComplete = rkdpProvider.on(
  'calculationCompleted',
  (result: SolutionPoint[]) => {
    solveTaskResult.value = result;
    calculateButtonDisabled.value = false;
  },
);

watch(solveTaskResult, (newValue) => {
  chartData.datasets = [];
  Object.keys(newValue[0]).forEach((key) => {
    if (key === range.value.varName) return;
    chartData.datasets.push({
      label: 'График оси ' + key,
      data: newValue.map((point) => {
        return { x: point[range.value.varName], y: point[key] };
      }),
      fill: false,
      tension: 0.1,
    });
  });
});
// #endregion

// #region Chart Settings
const chartData = reactive<ChartDataProp>({
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

const chartOptions = reactive<ChartOptionsProp>({
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
        text: 'Function value',
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
// #endregion

// #region Download Chart Image
const saveDialogVisible = ref(false);
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
// #endregion

// #region Cleanup Events
onUnmounted(() => {
  unsubscribeUpdateEq();
  unsubCalculateStart();
  unsubCalculateProgress();
  unsubscribeCalculateComplete();
});
// #endregion
</script>

<template>
  <header
    class="flex justify-between items-center p-2 pl-4 pr-4 m-2 border-2 rounded-3xl border-surface-600"
  >
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
              <label :for="'for-' + key" class="whitespace-nowrap"
                >{{ convertIC(key) }}({{ range.varName }}) =</label
              >
              <InputText
                v-model="initialConditions[key]"
                :input-id="'for-' + key"
                :maxFractionDigits="6"
                class="w-full"
              ></InputText>
            </div>
          </div>
        </template>
      </Card>
      <Divider></Divider>
      <Card>
        <template #title>Диапазон расчета</template>
        <template #content>
          <div class="flex flex-col gap-8 mt-8">
            <div class="flex gap-4">
              <FloatLabel>
                <InputText v-model="range.varName" id="varX" class="w-full"></InputText>
                <label for="varX">Рассчитать по (переменной)</label>
              </FloatLabel>
              <FloatLabel>
                <InputText v-model="range.initialStep" id="step" class="w-full"></InputText>
                <label for="step">Шаг</label>
              </FloatLabel>
            </div>
            <div class="flex gap-4">
              <FloatLabel>
                <InputText v-model="range.start" id="fromX" class="w-full"></InputText>
                <label for="fromX">Рассчитать от</label>
              </FloatLabel>
              <FloatLabel>
                <InputText v-model="range.end" id="toX" class="w-full"></InputText>
                <label for="toX">Рассчитать до</label>
              </FloatLabel>
            </div>
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
