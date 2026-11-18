export const useModal = () => {
  const isShowModal = ref(false);

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