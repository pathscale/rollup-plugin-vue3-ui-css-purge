<template>
  <h1>
    Hello <span class="name">{{ name }}</span>
    <Dummy />
  </h1>
</template>

<script>
import { defineComponent } from "vue";
import Dummy from "./Dummy.vue";
export default defineComponent({
  props: { name: { type: String, default: "John" } },
});
</script>
