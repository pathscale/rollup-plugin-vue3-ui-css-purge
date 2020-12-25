<script>
import { reactive, watchEffect, computed, onMounted } from "vue";
// eslint-disable-next-line import/no-unresolved -- components does not exist in npm yet
import { VField, VButton, VSwitch } from "@pathscale/vue3-ui";

export default {
  components: { VField, VButton, VSwitch },
  emits: ["login"],
  setup(props, { emit }) {
    const state = reactive({ email: "", password: "", remember: false });
    const status = reactive({ email: "valid", password: "valid" });

    const isValid = computed(() => status.email === "valid" && status.password === "valid");

    onMounted(() => {
      emit("whatever");
    });

    const sendLogin = () => {
      if (isValid.value) emit("login", state);
    };

    watchEffect(() => {
      status.email = state.email.length > 2 ? "valid" : "error";
      status.password = state.password.length > 2 ? "valid" : "error";
    });

    return { state, status, sendLogin, isValid };
  },
};
</script>

<template>
  <form>
    <v-field group-multiline>
      <VSwitch type="is-outlined" passive-type="is-warning" v-model="state.remember">
        Remember me
      </VSwitch>
    </v-field>
    <VField>
      <VButton
        expanded
        type="is-black"
        size="is-large"
        class="is-100 has-text-centered"
        @click="sendLogin"
        :disabled="!isValid"
        >Login</VButton
      >
    </VField>
  </form>
</template>
