import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useRouter,
} from "expo-router";


// Backend API
const BASE_URL = "http://10.0.2.2:5000";

const SERVICE_API =
  `${BASE_URL}/api/services?category=Body`;


// Service object coming from database
type ServiceItem = {

  _id: string;

  name: string;

  description?: string;

  price: number;

  duration: number;

  durationText: string;

};



export default function BodyCareServices() {


  const router = useRouter();


  // Selected services by customer
  const [
    selectedServices,
    setSelectedServices,
  ] = useState<ServiceItem[]>([]);



  // Services loaded from database
  const [
    services,
    setServices,
  ] = useState<ServiceItem[]>([]);



  // Loading state
  const [
    loading,
    setLoading,
  ] = useState(true);



  /*
    Load Body Care services
    from MongoDB through backend API
  */
  useEffect(() => {

    loadServices();

  }, []);




  const loadServices = async()=>{

    try {


      const response =
        await fetch(
          SERVICE_API
        );


      const data =
        await response.json();



      if(!response.ok){

        throw new Error(
          data.message ||
          "Failed to load body services"
        );

      }



      setServices(
        Array.isArray(data.services)
          ? data.services
          : []
      );



    } catch(error){


      console.log(
        "Body service loading error:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to load body care services"
      );


    } finally {


      setLoading(false);


    }

  };




  /*
    Add or remove service
  */
  const toggleService = (
    service: ServiceItem
  )=>{


    const exists =
      selectedServices.some(
        item =>
          item._id === service._id
      );



    if(exists){


      setSelectedServices(
        selectedServices.filter(
          item =>
            item._id !== service._id
        )
      );


    }else{


      setSelectedServices([
        ...selectedServices,
        service
      ]);


    }


  };



  /*
    Calculate total price
  */
  const totalAmount =
    selectedServices.reduce(
      (sum,item)=>
        sum + Number(item.price),
      0
    );

    return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color="#000"
          />
        </TouchableOpacity>


        <Text style={styles.headerText}>
          Body Care Services
        </Text>

      </View>



      <View style={styles.divider} />



      {/* STEP INDICATOR */}
      <View style={styles.stepContainer}>

        <Text style={styles.stepText}>
          Select one or more services to book
        </Text>


        <View style={styles.stepRow}>

          {[1,2,3,4].map((i)=>{

            const isDone =
              i === 1 &&
              selectedServices.length > 0;


            const isActive =
              i === 1 &&
              selectedServices.length === 0;


            return (

              <View
                key={i}
                style={styles.stepItem}
              >

                <View
                  style={[
                    styles.stepCircle,
                    isDone &&
                    styles.stepDone,
                    isActive &&
                    styles.stepActive,
                  ]}
                >

                  {
                    isDone &&
                    (
                      <Ionicons
                        name="checkmark"
                        size={10}
                        color="#fff"
                      />
                    )
                  }

                </View>


                {
                  i !== 4 &&
                  (
                    <View
                      style={styles.stepLine}
                    />
                  )
                }

              </View>

            );

          })}

        </View>

      </View>
{
        loading ?

        <View style={styles.loader}>

          <ActivityIndicator
            size="large"
            color="#FF2D55"
          />

          <Text>
            Loading body services...
          </Text>

        </View>
        :
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          {
            services.map((item)=>{


              const selected =
                selectedServices.some(
                  service =>
                    service._id === item._id
                );



              return (

                <TouchableOpacity

                  key={item._id}

                  style={[
                    styles.serviceCard,
                    selected &&
                    styles.selectedCard
                  ]}

                  onPress={() =>
                    toggleService(item)
                  }

                >


                  <View
                    style={styles.serviceContent}
                  >


                    <Text
                      style={styles.serviceTitle}
                    >
                      {item.name}
                    </Text>



                    <Text
                      style={styles.serviceDesc}
                    >
                      {item.description}
                    </Text>



                    <Text
                      style={styles.duration}
                    >
                      {item.durationText}
                    </Text>



                    <Text
                      style={styles.price}
                    >
                      LKR {item.price.toLocaleString()}
                    </Text>


                  </View>




                  <TouchableOpacity

                    style={[
                      styles.bookBtn,
                      selected &&
                      styles.addedBtn
                    ]}

                    onPress={() =>
                      toggleService(item)
                    }

                  >

                    <Text
                      style={styles.bookText}
                    >
                      {
                        selected
                        ? "Added"
                        : "Book"
                      }
                    </Text>

                  </TouchableOpacity>


                </TouchableOpacity>

              );


            })
          }



          <View
            style={{
              height:120
            }}
          />

        </ScrollView>

      }




      {/* BOTTOM SUMMARY */}

      <View style={styles.bottomBox}>


        <Text style={styles.summaryText}>

          {selectedServices.length}
          {" "}
          Service selected

        </Text>



        <Text style={styles.summaryPrice}>

          LKR {totalAmount.toFixed(2)}

        </Text>




        <TouchableOpacity

          disabled={
            selectedServices.length === 0
          }

          style={[
            styles.continueBtn,
            selectedServices.length === 0 &&
            {
              opacity:0.5
            }
          ]}
          onPress={()=>
            router.push({
              pathname:
              "/(customer)/(services)/dateTime",
              params:{
                selectedServices:
                JSON.stringify(
                  selectedServices
                ),
                selectedLength:
                "",
                totalAmount:
                String(totalAmount),
                bookingType:
                "body"
              }
            })
          }
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({

container:{
  flex:1,
  backgroundColor:"#F5F5F7",
  paddingTop:50,
  paddingHorizontal:16,
},


header:{
  flexDirection:"row",
  alignItems:"center",
},


headerText:{
  fontSize:18,
  fontWeight:"700",
  marginLeft:10,
},


divider:{
  height:1,
  backgroundColor:"#DADADA",
  marginTop:12,
  marginBottom:14,
},


stepContainer:{
  alignItems:"center",
  marginBottom:18,
},


stepText:{
  fontSize:13,
  color:"#777",
  marginBottom:10,
},


stepRow:{
  flexDirection:"row",
  alignItems:"center",
},


stepItem:{
  flexDirection:"row",
  alignItems:"center",
},


stepCircle:{
  width:18,
  height:18,
  borderRadius:9,
  backgroundColor:"#D1D5DB",
  justifyContent:"center",
  alignItems:"center",
},


stepActive:{
  backgroundColor:"#FF2D55",
},


stepDone:{
  backgroundColor:"#FF2D55",
},


stepLine:{
  width:34,
  height:2,
  backgroundColor:"#E5E7EB",
  marginHorizontal:5,
},


loader:{
  marginTop:60,
  alignItems:"center",
},


serviceCard:{
  backgroundColor:"#EDEDED",
  borderRadius:15,
  padding:15,
  marginBottom:12,
  flexDirection:"row",
  alignItems:"flex-end",
},


selectedCard:{
  backgroundColor:"#fff",
  borderWidth:2,
  borderColor:"#FF2D55",
},


serviceContent:{
  flex:1,
  paddingRight:8,
},


serviceTitle:{
  fontSize:15,
  fontWeight:"800",
},


serviceDesc:{
  fontSize:12,
  color:"#777",
  marginTop:3,
  lineHeight:16,
},


duration:{
  fontSize:12,
  color:"#777",
  marginTop:4,
},


price:{
  fontSize:13,
  color:"#FF2D55",
  fontWeight:"800",
  marginTop:4,
},


bookBtn:{
  backgroundColor:"#FF2D55",
  paddingHorizontal:18,
  paddingVertical:8,
  borderRadius:25,
},


addedBtn:{
  backgroundColor:"#888",
},


bookText:{
  color:"#fff",
  fontSize:12,
  fontWeight:"800",
},


bottomBox:{
  position:"absolute",
  bottom:0,
  left:0,
  right:0,
  backgroundColor:"#DADADA",
  paddingHorizontal:16,
  paddingTop:8,
  paddingBottom:12,
},


summaryText:{
  fontSize:14,
  fontWeight:"700",
},


summaryPrice:{
  fontSize:14,
  fontWeight:"800",
  marginBottom:8,
},


continueBtn:{
  backgroundColor:"#FF2D55",
  padding:15,
  borderRadius:25,
  alignItems:"center",
},


continueText:{
  color:"#fff",
  fontWeight:"800",
  fontSize:15,
},


});