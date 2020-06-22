<script>
import { reactive, watchEffect, computed, onMounted } from "vue";
// eslint-disable-next-line import/no-unresolved -- components does not exist in npm yet
import { VField, VButton, VSwitch as Trigger } from "@pathscale/vue3-ui";

const LoginForm = {
  components: { VField, VButton, Trigger },
  emits: ["login"],
  setup(props, { emit }) {
    const state = reactive({ email: "", password: "", remember: false });
    const status = reactive({ email: "valid", password: "valid" });

    const isValid = computed(() => status.email === "valid" && status.password === "valid");

    onMounted(() => {
      emit("whatever");
    });

    const sendLogin = () => {
      if (isValid.value) {
        emit("login", state);
      }
    };

    watchEffect(() => {
      status.email = state.email.length > 2 ? "valid" : "error";
      status.password = state.password.length > 2 ? "valid" : "error";
    });

    return { state, status, sendLogin, isValid };
  },
};

export default LoginForm;
</script>

<template>
  <form>
    <VField>
      <Trigger type="is-primary" passive-type="is-warning" v-model="state.remember">
        Remember me
      </Trigger>
    </VField>
    <VField>
      <VButton type="is-success" @click="sendLogin" :disabled="!isValid">
        Login
      </VButton>
    </VField>
  </form>
</template>
