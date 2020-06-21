<template>
  <h1>
    Hello <span class="name">{{ name }}</span>
    <LoginForm />
  </h1>
</template>

<script>
import { defineComponent } from "vue";
import LoginForm from "./LoginForm.vue";
export default defineComponent({
  props: { name: { type: String, default: "John" } },
});
</script>

<style scoped>
.name {
  color: blue;
}

.face {
  color: red;
}

.bar {
  color: magenta;
}

.fop {
  color: blueviolet;
}
</style>
