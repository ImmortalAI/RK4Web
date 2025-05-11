<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';

import { useTheme } from '@/composables/useTheme';
import { DormandPrinceSolver } from '@/utils/rkdp';
import type { Range } from '@/utils/rkdp';

const theme = useTheme();

const rkdpProvider = reactive<DormandPrinceSolver>(new DormandPrinceSolver());
const range = ref<Range>({ start: 0, end: 1, initialStep: 0.1 });

onMounted(() => {
  addInput('y_1=y_0+5 x');
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

const unsubscribeUpdateEq = rkdpProvider.subscribe("equationsUpdated", () => {
  Object.keys(initialConditions).forEach(key => delete initialConditions[key])
  rkdpProvider.getVariableNames().forEach((varName) => {
    initialConditions[varName] = 0;
  })
})

watch(initialConditions, (newConditions) => {
  rkdpProvider.setInitialConditions(newConditions);
})

// TODO delete in future
const tempSub = rkdpProvider.subscribe('initialConditionsChanged', (n: Record<string, number>) => console.log("IC changed: " + Object.keys(n).map(value => n[value])));

watch(range, (newVal) => {
  rkdpProvider.setRange(newVal.start, newVal.end, newVal.initialStep);
}, {deep: true})
// TODO delete in future
const tempSub2 = rkdpProvider.subscribe('rangeChanged', (n: Range) => console.log(`New range: ${n.start} ${n.end} ${n.initialStep}`));
</script>

<template>
  <main class="flex justify-center items-center flex-col md:flex-row gap-4 p-4">
    <div class="md:basis-1/3 flex flex-col">
      <Card>
        <template #title> Дифференциальные уравнения </template>
        <template #content>
          <div class="flex items-center gap-2 border border-primary rounded-xl p-2 m-2"
            v-for="(input, index) in mathinputFieldsData" :key="index">
            <MathLiveInput class="w-full" v-model="input.value" :dark="theme.isDark.value" format="ascii" />
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
            <div v-for="(value, key) in initialConditions" :key="key" class="flex justify-between items-center mb-1">
              <label :for="'for-' + key">{{ key }}(x) =</label>
              <InputNumber v-model="initialConditions[key]" :id="'for-' + key" :maxFractionDigits="6"></InputNumber>
            </div>
          </div>
        </template>
      </Card>
      <Divider></Divider>
      <Card>
        <template #title>Диапазон расчета</template>
        <template #content>
          <div class="flex flex-col gap-2 mb-2">
            <div class="flex justify-between items-center mb-1">
              <label for="fromX">Рассчитать от</label>
              <InputNumber v-model="range.start" id="fromX" :maxFractionDigits="3"></InputNumber>
            </div>
            <div class="flex justify-between items-center mb-1">
              <label for="toX">Рассчитать до</label>
              <InputNumber v-model="range.end" id="toX" :maxFractionDigits="3"></InputNumber>
            </div>
            <div class="flex justify-between items-center">
              <label for="step">Шаг</label>
              <InputNumber v-model="range.initialStep" id="step" :minFractionDigits="1" :maxFractionDigits="3"></InputNumber>
            </div>
          </div>
        </template>
      </Card>
      <div class="p-2"></div>
      <Button label="Рассчитать" />
    </div>
    <div class="md:basis-2/3">
      <Chart></Chart>
    </div>
  </main>
</template>
