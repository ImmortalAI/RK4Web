<template>
  <div ref="container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { MathfieldElement } from 'mathlive'

const props = defineProps<{
  modelValue: string
  options?: Partial<ConstructorParameters<typeof MathfieldElement>[0]>
  class?: string | string[] | Record<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const container = ref<HTMLElement | null>(null)
let mathfield: MathfieldElement

onMounted(() => {
  mathfield = new MathfieldElement(props.options ?? {})
  mathfield.value = props.modelValue

  if (props.class) {
    const classList = normalizeClass(props.class)
    mathfield.classList.add(...classList)
  }

  mathfield.addEventListener('input', () => {
    emit('update:modelValue', mathfield.value)
  })

  container.value?.appendChild(mathfield)
})

watch(
  () => props.modelValue,
  (val) => {
    if (mathfield && mathfield.value !== val) {
      mathfield.value = val
    }
  },
)

watch(
  () => props.class,
  (newClass, oldClass) => {
    if (mathfield) {
      updateClassList(newClass, oldClass)
    }
  },
)

onBeforeUnmount(() => {
  if (container.value?.contains(mathfield)) {
    container.value.removeChild(mathfield)
  }
})

function normalizeClass(input: typeof props.class): string[] {
  if (typeof input === 'string') return input.trim().split(/\s+/)
  if (Array.isArray(input)) return input
  if (typeof input === 'object' && input !== null) {
    return Object.entries(input)
      .filter(([_, active]) => active) //eslint-disable-line
      .map(([cls]) => cls)
  }
  return []
}

function updateClassList(newClass?: typeof props.class, oldClass?: typeof props.class) {
  const oldClasses = normalizeClass(oldClass)
  const newClasses = normalizeClass(newClass)

  if (mathfield) {
    mathfield.classList.remove(...oldClasses)
    mathfield.classList.add(...newClasses)
  }
}
</script>
