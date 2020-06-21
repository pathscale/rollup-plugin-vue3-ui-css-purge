<script>
import { reactive, watchEffect, computed, onMounted } from "vue";
// eslint-disable-next-line import/no-unresolved -- components does not exist in npm yet
import { Input, Field, Button, Switch } from "@pathscale/vue3-ui";

const LoginForm = {
  components: { Input, Field, Button, Switch },
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
    <Field label="Email">
      <Input name="email" v-model="state.email" placeholder="Enter email" />
    </Field>
    <Field label="Password">
      <Input
        name="password"
        type="password"
        v-model="state.password"
        placeholder="Enter password"
      />
    </Field>
    <Field>
      <Switch type="is-primary" passive-type="is-warning" v-model="state.remember">
        Remember me
      </Switch>
    </Field>
    <Field>
      <Button type="is-success" @click="sendLogin" :disabled="!isValid">
        Login
      </Button>
    </Field>
  </form>
</template>
