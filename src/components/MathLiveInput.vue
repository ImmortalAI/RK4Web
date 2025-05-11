<template>
  <div class="w-full" ref="container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, type PropType } from 'vue';
import { MathfieldElement } from 'mathlive';

const props = defineProps<{
  modelValue: string;
  options?: Partial<ConstructorParameters<typeof MathfieldElement>[0]>;
  class?: string | string[] | Record<string, boolean>;
  dark?: boolean;
  format?: 'latex' | 'ascii';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const container = ref<HTMLElement | null>(null);
let mathfield: MathfieldElement;

onMounted(() => {
  mathfield = new MathfieldElement(props.options ?? {});

  if (props.format === 'ascii') {
    mathfield.setValue(props.modelValue, { format: 'ascii-math' });
  } else {
    mathfield.value = props.modelValue;
  }

  updateTheme(props.dark);

  if (props.class) {
    const classList = normalizeClass(props.class);
    mathfield.classList.add(...classList);
  }

  mathfield.addEventListener('input', () => {
    if (props.format === 'ascii') {
      emit('update:modelValue', mathfield.getValue('ascii-math'));
    } else {
      emit('update:modelValue', mathfield.value);
    }
  });

  container.value?.appendChild(mathfield);
});

watch(
  () => props.modelValue,
  (val) => {
    if (mathfield == null) return;
    const old = props.format === 'ascii' ? mathfield.getValue('ascii-math') : mathfield.value;
    if (old !== val) {
      if (props.format === 'ascii') {
        mathfield.setValue(val, { format: 'ascii-math' });
      } else {
        mathfield.value = val;
      }
    }
  },
);

watch(
  () => props.class,
  (newClass, oldClass) => {
    if (mathfield) {
      updateClassList(newClass, oldClass);
    }
  },
);

watch(
  () => props.dark,
  (isDark) => {
    updateTheme(isDark);
  },
);

onBeforeUnmount(() => {
  if (container.value?.contains(mathfield)) {
    container.value.removeChild(mathfield);
  }
});

function normalizeClass(input: typeof props.class): string[] {
  if (typeof input === 'string') return input.trim().split(/\s+/);
  if (Array.isArray(input)) return input;
  if (typeof input === 'object' && input !== null) {
    return Object.entries(input)
      .filter(([_, active]) => active) //eslint-disable-line
      .map(([cls]) => cls);
  }
  return [];
}

function updateClassList(newClass?: typeof props.class, oldClass?: typeof props.class) {
  const oldClasses = normalizeClass(oldClass);
  const newClasses = normalizeClass(newClass);

  if (mathfield) {
    mathfield.classList.remove(...oldClasses);
    mathfield.classList.add(...newClasses);
  }
}

function updateTheme(isDark?: boolean) {
  const body = document.body;
  if (!body) return;

  if (isDark === true) {
    body.setAttribute('theme', 'dark');
  } else {
    body.setAttribute('theme', 'light');
  }
}
</script>

<!-- <style>
body[theme='dark'] {
  --contains-highlight-background-color: #444444;
  --highlight-background-color: #333333;
  --selection-background-color: #555555;
}
</style> -->
