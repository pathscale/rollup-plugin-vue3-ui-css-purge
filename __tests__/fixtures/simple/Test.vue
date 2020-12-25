<template>
  <h1>
    Hello <span class="name">{{ name }}</span>
    <Dummy />
  </h1>
</template>

<script>
import Dummy from "./Dummy.vue";
export default {
  components: { Dummy },
  props: { name: { type: String, default: "John" } },
};
</script>
