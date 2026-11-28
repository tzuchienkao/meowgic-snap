/** Dialogs opened from more than one place */
export enum ModalName {
  /** 登入: the landing header's 登入 button and the home page's 登入存檔 */
  Login = 'login',
}

/** Open state of a named dialog, shared app-wide (the layout renders it, any page can open it) */
export const useModal = (name: ModalName) => {
  const isShowModal = useState(`modal:${name}`, () => false);

  const openModal = () => {
    isShowModal.value = true;
  };

  const closeModal = () => {
    isShowModal.value = false;
  };

  return {
    isShowModal,
    openModal,
    closeModal
  };
};
