// import { SafeAreaView } from "react-native";
// import { useTranslation } from "react-i18next";
// import { useState } from "react";
// import HeaderNavigation from "~/components/ui/header";
// import IzuSelector from "~/components/ui/izu-selector";
// import { Izus } from "~/types";
// import FormNavigation from "~/components/ui/form-navigation";
// import { router } from "expo-router";

// const StatisticsScreen = () => {
//   const { t } = useTranslation();
//   const [selectedIzu, setSelectedIzu] = useState<Izus | undefined>(undefined);

//   return (
//     <SafeAreaView className="flex-1 bg-background">
//       <HeaderNavigation
//         showLeft={true}
//         showRight={true}
//         title={t("StatisticsPage.title")}
//       />
//       <IzuSelector
//         onSelect={(value) => {
//           setSelectedIzu(value);
//         }}
//         initialValue={selectedIzu}
//       />
//       <FormNavigation
//         onNext={() => {
//           console.log("Izu:", selectedIzu);
//           router.push(`/(statistics)/${selectedIzu?.id}?izu_name=${selectedIzu?.name}&izucode=${selectedIzu?.izucode}`);
//         }}
//         isNextDisabled={!selectedIzu}
//         showBack={false}
//       />
//     </SafeAreaView>
//   );
// };

// export default StatisticsScreen;
