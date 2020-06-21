declare module "*.vue" {
  // eslint-disable-next-line no-unused-vars -- needed for type
  import { ComponentOptions } from "vue";

  const component: ComponentOptions;
  export default component;
}

declare module "vuex";

declare module "@pathscale/vue3-ui" {
  const AlertComponent: any;
  const AppbarComponent: any;
  const BadgeComponent: any;
  const ButtonComponent: any;
  const CardComponent: any;
  const CardTitleComponent: any;
  const CardBodyComponent: any;
  const CardFooterComponent: any;
  const CheckboxComponent: any;
  const ChipComponent: any;
  const ChipsComponent: any;
  const Layout: any;
  const ModalComponent: any;
  const ProgressIndicatorComponent: any;
  const RadioButtonComponent: any;
  const SelectComponent: any;
  const SpacerComponent: any;
  const SwitchComponent: any;
  const TabsComponent: any;
  const TabComponent: any;
  const TextAreaComponent: any;
  const TextInputComponent: any;
  const TooltipComponent: any;
  const TypographyComponent: any;
  export {
    AlertComponent,
    AppbarComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    CardTitleComponent,
    CardBodyComponent,
    CardFooterComponent,
    CheckboxComponent,
    ChipComponent,
    ChipsComponent,
    Layout,
    ModalComponent,
    ProgressIndicatorComponent,
    RadioButtonComponent,
    SelectComponent,
    SpacerComponent,
    SwitchComponent,
    TypographyComponent,
    TabsComponent,
    TabComponent,
    TextAreaComponent,
    TextInputComponent,
    TooltipComponent,
  };
}
