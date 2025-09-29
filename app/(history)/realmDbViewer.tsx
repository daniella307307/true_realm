// import React, { useState, useEffect } from 'react';
// import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
// import { RealmContext } from '~/providers/RealContextProvider';
// import HeaderNavigation from '~/components/ui/header';
// import { useTranslation } from 'react-i18next';


// const { useRealm } = RealmContext;

// const RealmDatabaseViewer = () => {
//   const { t } = useTranslation();
//   const realm = useRealm();
//   const [submissions, setSubmissions] = useState<any[]>([]);
//   const [families, setFamilies] = useState<any[]>([]);
//   const [izus, setIzus] = useState<any[]>([]);
//   const [selectedTab, setSelectedTab] = useState<'submissions' | 'families' | 'izus'>('submissions');
//   const [selectedItem, setSelectedItem] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     loadData();
//   }, [realm]);

//   const loadData = async () => {
//     if (!realm) {
//       console.log('Realm not available');
//       setLoading(false);
//       return;
//     }

//     try {
//       setLoading(true);
      
//       // Load submissions - using the exact schema from your save function
//       const submissionsData = realm.objects('SurveySubmission');
//       console.log('Found submissions:', submissionsData.length);
      
//       const processedSubmissions = Array.from(submissionsData).map((item: any) => {
//         console.log('Processing submission:', item.id);
//         return {
//           id: item.id,
//           answers: item.answers || {},
//           form_data: item.form_data || {},
//           location: item.location || {},
//           sync_data: item.sync_data || {},
//           created_at: item.created_at,
//           updated_at: item.updated_at,
//         };
//       });
      
//       setSubmissions(processedSubmissions);

//       // Load families if they exist
//       try {
//         const familiesData = realm.objects('LocallyCreatedFamily');
//         console.log('Found families:', familiesData.length);
        
//         const processedFamilies = Array.from(familiesData).map((item: any) => ({
//           id: item.id,
//           hh_id: item.hh_id,
//           hh_head_fullname: item.hh_head_fullname,
//           village_name: item.village_name,
//           form_data: item.form_data || {},
//           sync_data: item.sync_data || {},
//           meta: item.meta || {},
//           created_at: item.created_at,
//           updated_at: item.updated_at,
//         }));
        
//         setFamilies(processedFamilies);
//       } catch (error) {
//         console.log('No families collection or error:', error);
//         setFamilies([]);
//       }

//       // Load izus if they exist
//       try {
//         const izusData = realm.objects('LocallyCreatedIzu');
//         console.log('Found izus:', izusData.length);
        
//         const processedIzus = Array.from(izusData).map((item: any) => ({
//           id: item.id,
//           name: item.name,
//           name_kin: item.name_kin,
//           form_data: item.form_data || {},
//           sync_data: item.sync_data || {},
//           location: item.location || {},
//           created_at: item.created_at,
//           updated_at: item.updated_at,
//         }));
        
//         setIzus(processedIzus);
//       } catch (error) {
//         console.log('No izus collection or error:', error);
//         setIzus([]);
//       }

//     } catch (error) {
//       console.error('Error loading data:', error);
//       Alert.alert('Error', 'Failed to load data from database: ' + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderJsonData = (data: any, title: string) => {
//     if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
//       return (
//         <View style={{ marginVertical: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
//           <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{title}</Text>
//           <Text style={{ color: '#666', fontStyle: 'italic' }}>No data</Text>
//         </View>
//       );
//     }
    
//     return (
//       <View style={{ marginVertical: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
//         <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{title}</Text>
//         <ScrollView style={{ maxHeight: 300 }}>
//           <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
//             {JSON.stringify(data, null, 2)}
//           </Text>
//         </ScrollView>
//       </View>
//     );
//   };

//   const renderItem = (item: any, type: string) => (
//     <TouchableOpacity
//       key={`${type}-${item.id}`}
//       style={{
//         padding: 15,
//         margin: 5,
//         backgroundColor: 'white',
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: '#ddd',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.2,
//         shadowRadius: 2,
//         elevation: 2,
//       }}
//       onPress={() => setSelectedItem({ ...item, type })}
//     >
//       <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
//         {type === 'submissions' ? `Submission ID: ${item.id}` :
//          type === 'families' ? `Family: ${item.hh_id || item.id}` :
//          `Izu: ${item.name || item.id}`}
//       </Text>
      
//       {type === 'submissions' && (
//         <>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Project: {item.form_data?.project_id || 'N/A'}
//           </Text>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Module: {item.form_data?.project_module_id || 'N/A'}
//           </Text>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Family: {item.form_data?.family || 'N/A'}
//           </Text>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Form Fields: {item.answers ? Object.keys(item.answers).length : 0}
//           </Text>
//         </>
//       )}
      
//       {type === 'families' && (
//         <>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Head: {item.hh_head_fullname || 'N/A'}
//           </Text>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Village: {item.village_name || 'N/A'}
//           </Text>
//         </>
//       )}
      
//       {type === 'izus' && (
//         <>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Name (Kin): {item.name_kin || 'N/A'}
//           </Text>
//           <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
//             Location: {item.location?.village || 'N/A'}
//           </Text>
//         </>
//       )}
      
//       <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
//         Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
//       </Text>
//     </TouchableOpacity>
//   );

//   const renderDetailView = () => {
//     if (!selectedItem) return null;

//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
//         <HeaderNavigation
//           showLeft={true}
//           showRight={false}
//           title={`${selectedItem.type.toUpperCase()} Details`}
          
//         />
        
//         <ScrollView style={{ flex: 1, padding: 20 }}>
//           <View style={{ 
//             backgroundColor: 'white', 
//             padding: 16, 
//             borderRadius: 8, 
//             marginBottom: 16,
//             shadowColor: '#000',
//             shadowOffset: { width: 0, height: 2 },
//             shadowOpacity: 0.1,
//             shadowRadius: 4,
//             elevation: 3,
//           }}>
//             <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
//               {selectedItem.type === 'submissions' ? `Submission ID: ${selectedItem.id}` :
//                selectedItem.type === 'families' ? `Family: ${selectedItem.hh_id || selectedItem.id}` :
//                `Izu: ${selectedItem.name || selectedItem.id}`}
//             </Text>

//             {/* Basic Information */}
//             <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Basic Information</Text>
//             {selectedItem.type === 'submissions' && (
//               <>
//                 <Text>Project ID: {selectedItem.form_data?.project_id || 'N/A'}</Text>
//                 <Text>Module ID: {selectedItem.form_data?.project_module_id || 'N/A'}</Text>
//                 <Text>Survey ID: {selectedItem.form_data?.survey_id || 'N/A'}</Text>
//                 <Text>Family: {selectedItem.form_data?.family || 'N/A'}</Text>
//                 <Text>Table: {selectedItem.form_data?.table_name || 'N/A'}</Text>
//               </>
//             )}
            
//             {selectedItem.type === 'families' && (
//               <>
//                 <Text>HH ID: {selectedItem.hh_id || 'N/A'}</Text>
//                 <Text>Head Name: {selectedItem.hh_head_fullname || 'N/A'}</Text>
//                 <Text>Village: {selectedItem.village_name || 'N/A'}</Text>
//               </>
//             )}
            
//             {selectedItem.type === 'izus' && (
//               <>
//                 <Text>Name: {selectedItem.name || 'N/A'}</Text>
//                 <Text>Name (Kinyarwanda): {selectedItem.name_kin || 'N/A'}</Text>
//               </>
//             )}
            
//             <Text>Created: {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : 'N/A'}</Text>
//             <Text>Updated: {selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : 'N/A'}</Text>
//           </View>

//           {/* Form Data */}
//           {renderJsonData(selectedItem.form_data, 'Form Data')}

//           {/* Sync Data */}
//           {renderJsonData(selectedItem.sync_data, 'Sync Data')}

//           {/* Type-specific data */}
//           {selectedItem.type === 'submissions' && renderJsonData(selectedItem.answers, 'Form Answers')}
//           {selectedItem.type === 'submissions' && renderJsonData(selectedItem.location, 'Location Data')}
//           {selectedItem.type === 'families' && renderJsonData(selectedItem.meta, 'Meta Data')}
//           {selectedItem.type === 'izus' && renderJsonData(selectedItem.location, 'Location Data')}
//         </ScrollView>
//       </SafeAreaView>
//     );
//   };

//   if (selectedItem) {
//     return renderDetailView();
//   }

//   if (loading) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
//         <HeaderNavigation
//           showLeft={true}
//           showRight={false}
//           title="Database Viewer"
          
//         />
//         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//           <Text>Loading database...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
//       <HeaderNavigation
//         showLeft={true}
//         showRight={false}
//         title="Database Viewer"
//       />

//       {/* Tab Navigation */}
//       <View style={{ 
//         flexDirection: 'row', 
//         backgroundColor: 'white', 
//         paddingVertical: 10,
//         paddingHorizontal: 20,
//         borderBottomWidth: 1,
//         borderBottomColor: '#ddd'
//       }}>
//         {[
//           { key: 'submissions', label: `Submissions (${submissions.length})` },
//           { key: 'families', label: `Families (${families.length})` },
//           { key: 'izus', label: `Izus (${izus.length})` }
//         ].map((tab) => (
//           <TouchableOpacity
//             key={tab.key}
//             onPress={() => setSelectedTab(tab.key as any)}
//             style={{
//               flex: 1,
//               padding: 12,
//               backgroundColor: selectedTab === tab.key ? '#007AFF' : 'transparent',
//               borderRadius: 6,
//               marginHorizontal: 4,
//               alignItems: 'center'
//             }}
//           >
//             <Text style={{ 
//               color: selectedTab === tab.key ? 'white' : '#007AFF',
//               fontWeight: selectedTab === tab.key ? 'bold' : 'normal',
//               fontSize: 14
//             }}>
//               {tab.label}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Content */}
//       <ScrollView style={{ flex: 1, padding: 16 }}>
//         {selectedTab === 'submissions' && (
//           <View>
//             <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
//               Survey Submissions ({submissions.length})
//             </Text>
//             {submissions.length === 0 ? (
//               <View style={{ 
//                 backgroundColor: 'white', 
//                 padding: 32, 
//                 borderRadius: 8, 
//                 alignItems: 'center',
//                 marginTop: 50 
//               }}>
//                 <Text style={{ color: '#666', fontSize: 16 }}>No submissions found in database</Text>
//                 <Text style={{ color: '#999', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
//                   Fill out a form to see submissions appear here
//                 </Text>
//               </View>
//             ) : (
//               submissions.map(item => renderItem(item, 'submissions'))
//             )}
//           </View>
//         )}

//         {selectedTab === 'families' && (
//           <View>
//             <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
//               Families ({families.length})
//             </Text>
//             {families.length === 0 ? (
//               <View style={{ 
//                 backgroundColor: 'white', 
//                 padding: 32, 
//                 borderRadius: 8, 
//                 alignItems: 'center',
//                 marginTop: 50 
//               }}>
//                 <Text style={{ color: '#666', fontSize: 16 }}>No families found in database</Text>
//               </View>
//             ) : (
//               families.map(item => renderItem(item, 'families'))
//             )}
//           </View>
//         )}

//         {selectedTab === 'izus' && (
//           <View>
//             <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
//               Izus ({izus.length})
//             </Text>
//             {izus.length === 0 ? (
//               <View style={{ 
//                 backgroundColor: 'white', 
//                 padding: 32, 
//                 borderRadius: 8, 
//                 alignItems: 'center',
//                 marginTop: 50 
//               }}>
//                 <Text style={{ color: '#666', fontSize: 16 }}>No izus found in database</Text>
//               </View>
//             ) : (
//               izus.map(item => renderItem(item, 'izus'))
//             )}
//           </View>
//         )}
//       </ScrollView>

//       {/* Debug/Refresh Button */}
//       <TouchableOpacity
//         onPress={loadData}
//         style={{
//           position: 'absolute',
//           bottom: 30,
//           right: 30,
//           backgroundColor: '#007AFF',
//           paddingHorizontal: 20,
//           paddingVertical: 12,
//           borderRadius: 25,
//           elevation: 5,
//           shadowColor: '#000',
//           shadowOffset: { width: 0, height: 2 },
//           shadowOpacity: 0.3,
//           shadowRadius: 4,
//         }}
//       >
//         <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Refresh</Text>
//       </TouchableOpacity>

//       {/* Quick Stats */}
//       {!loading && (
//         <View style={{ 
//           backgroundColor: '#f0f0f0', 
//           padding: 12, 
//           borderTopWidth: 1, 
//           borderTopColor: '#ddd' 
//         }}>
//           <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
//             Database: {submissions.length + families.length + izus.length} total records
//             {realm && ` • Path: ${realm.path.split('/').pop()}`}
//           </Text>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// };

// export default RealmDatabaseViewer;


import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { RealmContext } from "~/providers/RealContextProvider";
import HeaderNavigation from "~/components/ui/header";
import { useTranslation } from "react-i18next";
import { useAuth } from "~/lib/hooks/useAuth";
import { router } from "expo-router";
import { baseInstance } from  "~/utils/axios";
const { useRealm } = RealmContext;

const RealmDatabaseViewer = () => {
  const { t } = useTranslation();
  const { user } = useAuth({});
  const realm = useRealm();
  const [submissionsByModule, setSubmissionsByModule] = useState<
    Record<string, any[]>
  >({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'modules' | 'submissions' | 'details'>('modules');
 

  useEffect(() => {
    // Check authentication first
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please log in to view submission history.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }
    
    loadData();
  }, [realm, user]);

  const loadData = async () => {
    if (!realm) {
      console.log("Realm not available");
      setLoading(false);
    
      return;
    }

    try {
      setLoading(true);
      const submissionsData = realm.objects("SurveySubmission");

      const processedSubmissions = Array.from(submissionsData).map((item: any) => ({
        id: item.id,
        answers: item.answers || {},
        form_data: item.form_data || {},
        location: item.location || {},
        sync_data: item.sync_data || {},
        created_at: item.created,
        updated_at: item.updated,
      }));

      // Group by module_id and get module names
      const grouped: Record<string, any[]> = {};
      processedSubmissions.forEach((s) => {
        const moduleId = s.form_data?.project_id || "unknown";
        const moduleName = s.form_data?.project_title || s.form_data?.project_name || `Module ${moduleId}`;
        
        // Use module name as the key for better display
        const moduleKey = moduleName;
        if (!grouped[moduleKey]) {
          grouped[moduleKey] = [];
        }
        grouped[moduleKey].push({
          ...s,
          moduleId,
          moduleName,
        });
      });

      // Sort modules by name
      const sortedGrouped: Record<string, any[]> = {};
      Object.keys(grouped)
        .sort()
        .forEach(key => {
          sortedGrouped[key] = grouped[key].sort((a, b) => {
            // Sort submissions by created_at (newest first)
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB.getTime() - dateA.getTime();
          });
        });

      setSubmissionsByModule(sortedGrouped);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data from database: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  
  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "Not provided";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderFormData = (answers: any, depth = 0) => {
    if (!answers || Object.keys(answers).length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No form data available</Text>
        </View>
      );
    }

    // Filter out the language field and any other unwanted fields
    const filteredEntries = Object.entries(answers).filter(([key]) => 
      key !== "language" && key !== "submit"
    );

    if (filteredEntries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No form data available</Text>
        </View>
      );
    }

    return filteredEntries.map(([key, value], idx, array) => (
      <View key={`${key}-${idx}`}>
        <View style={[styles.fieldContainer, { marginLeft: depth * 16 }]}>
          <Text style={styles.fieldLabel}>
            {formatFieldName(key)}
          </Text>
          
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <View style={styles.nestedContainer}>
              {renderFormData(value, depth + 1)}
            </View>
          ) : (
            <Text style={styles.fieldValue}>
              {formatValue(value)}
            </Text>
          )}
        </View>
        
        {/* Add divider between fields, but not after the last one */}
        {idx < array.length - 1 && (
          <View style={styles.fieldDivider} />
        )}
      </View>
    ));
  };

  const renderModuleCard = (moduleName: string, submissions: any[]) => (
    <TouchableOpacity
      key={moduleName}
      style={styles.moduleCard}
      onPress={() => {
        setSelectedModule(moduleName);
        setCurrentView('submissions');
      }}
    >
      <View style={styles.moduleHeader}>
        <Text style={styles.moduleTitle}>
          {moduleName}
        </Text>
        <View style={styles.moduleBadge}>
          <Text style={styles.moduleBadgeText}>
            {submissions.length}
          </Text>
        </View>
      </View>
      
      <Text style={styles.moduleSubtitle}>
        {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
      </Text>
      
      {/* Show latest submission info */}
      {submissions.length > 0 && (
        <View style={styles.moduleFooter}>
          <Text style={styles.moduleFooterText}>
            Latest: {submissions[0].created_at 
              ? new Date(submissions[0].created_at).toLocaleDateString() 
              : "N/A"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSubmissionItem = (item: any) => (
  
    <TouchableOpacity
      key={item.id}
      style={styles.itemContainer}
      onPress={() => {
        setSelectedItem(item);
        setCurrentView('details');
      }}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>
          Submission #{item.id}
        </Text>
        <Text style={styles.itemBadge}>
          {item.answers ? Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length : 0} fields
        </Text>
      </View>
      
      <View style={styles.itemMeta}>
        <Text style={styles.itemDate}>
          Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
        </Text>
        {item.updated_at && item.updated_at !== item.created_at && (
          <Text style={styles.itemDate}>
            Updated: {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      {/* Preview of first few fields (excluding language) */}
      {item.answers && Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length > 0 && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview:</Text>
          {Object.entries(item.answers)
            .filter(([key]) => key !== 'language' && key !== 'submit')
            .slice(0, 2)
            .map(([key, value]) => (
            <Text key={key} style={styles.previewText} numberOfLines={1}>
              {formatFieldName(key)}: {formatValue(value)}
            </Text>
          ))}
          {Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length > 2 && (
            <Text style={styles.moreText}>
              +{Object.keys(item.answers).filter(key => key !== 'language' && key !== 'submit').length - 2} more fields
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderModulesView = () => (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation showLeft={true} title="Submission History" />
      
      <ScrollView style={styles.modulesList}>
        {Object.keys(submissionsByModule).length > 0 ? (
          <>
            <View style={styles.listHeader}>
              {/* <Text style={styles.listHeaderText}>
                {Object.keys(submissionsByModule).length} module{Object.keys(submissionsByModule).length !== 1 ? 's' : ''} with submissions
              </Text> */}
            </View>
            {Object.entries(submissionsByModule).map(([moduleName, submissions], index, array) => (
              <View key={moduleName}>
                {renderModuleCard(moduleName, submissions)}
                {/* Add divider between modules, but not after the last one */}
                {index < array.length - 1 && (
                  <View style={styles.moduleDivider} />
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No submissions found</Text>
            <Text style={styles.emptySubText}>
              Complete some forms to see submission history here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderSubmissionsView = () => (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation 
        showLeft={true} 
        title={selectedModule || "Submissions"}
      />
      
      <ScrollView style={styles.listContainer}>
        {selectedModule && submissionsByModule[selectedModule] ? (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {submissionsByModule[selectedModule].length} submission{submissionsByModule[selectedModule].length !== 1 ? 's' : ''} in {selectedModule}
              </Text>
            </View>
            {submissionsByModule[selectedModule].map(renderSubmissionItem)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No submissions found for this module</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const renderDetailView = () => {
    if (!selectedItem) return null;

    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation
          showLeft={true}
          title="Submission Details"
          
        />

        <ScrollView style={styles.detailScrollView}>
          {/* Header Info */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              Submission #{selectedItem.id}
            </Text>
            <Text style={styles.detailSubtitle}>
              Module: {selectedItem.moduleName || selectedItem.form_data?.project_module_id || "Unknown"}
            </Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.timestamp}>
                Created: {selectedItem.created_at 
                  ? new Date(selectedItem.created_at).toLocaleString() 
                  : "N/A"}
              </Text>
              {selectedItem.updated_at && selectedItem.updated_at !== selectedItem.created_at && (
                <Text style={styles.timestamp}>
                  Updated: {new Date(selectedItem.updated_at).toLocaleString()}
                </Text>
              )}
            </View>
          </View>

          {/* Form Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Form Data</Text>
            <View style={styles.sectionContent}>
              {renderFormData(selectedItem.answers)}
            </View>
          </View> 
        </ScrollView>
      </SafeAreaView>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Submissions...</Text>
      </SafeAreaView>
    );
  }

  // Check authentication
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderNavigation showLeft={true} title="Authentication Required" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please log in to view submission history</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render appropriate view based on current state
  switch (currentView) {
    case 'modules':
      return renderModulesView();
    case 'submissions':
      return renderSubmissionsView();
    case 'details':
      return renderDetailView();
    default:
      return renderModulesView();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  modulesList: {
    flex: 1,
    padding: 16,
  },
  moduleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
  },
  moduleBadge: {
    backgroundColor: "#A23A91 ",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moduleBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  moduleSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
  },
  moduleFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    paddingTop: 12,
    marginTop: 12,
  },
  moduleFooterText: {
    fontSize: 12,
    color: "#495057",
    fontWeight: "500",
  },
  moduleDivider: {
    height: 1,
    backgroundColor: "#dee2e6",
    marginVertical: 16,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
  },
  itemContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    flex: 1,
  },
  itemBadge: {
    backgroundColor: "#e9ecef",
    color: "#495057",
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemMeta: {
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  previewContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 2,
  },
  moreText: {
    fontSize: 11,
    color: "#A23A91 ",
    fontStyle: "italic",
    marginTop: 2,
  },
  detailScrollView: {
    flex: 1,
  },
  detailHeader: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 4,
  },
  detailSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 12,
  },
  timestampContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#495057",
    marginBottom: 2,
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  fieldContainer: {
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: "#212529",
    lineHeight: 20,
  },
  nestedContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#dee2e6",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
    marginVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    fontStyle: "italic",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
});

export default RealmDatabaseViewer;