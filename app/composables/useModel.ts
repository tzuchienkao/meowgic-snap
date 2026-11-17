export const useModel = () => {
  const isShowModel = ref(false);

  const openModel = () => {
    isShowModel.value = true;
  };

  const closeModel = () => {
    isShowModel.value = false;
  };

  return {
    isShowModel,
    openModel,
    closeModel
  };
};