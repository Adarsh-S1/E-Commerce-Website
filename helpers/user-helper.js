var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
const { response } = require('express')
var objectId=require('mongodb').ObjectID
const Razorpay=require('razorpay')
const { ObjectId } = require('mongodb')
const { resolve } = require('path')
var instance = new Razorpay({
  key_id: 'rzp_test_pd71wI8aXMt1wf',
  key_secret: 'Y6k49kYdekn5xMd9HB5gY50o',
});
module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
              resolve(data.ops[0])
            })
    
    
    })

    },
    doLogin:(userData)=>{
      return new Promise(async(resolve,reject)=>{
        let loginSatus=false
        let response={}
        let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
        if(user){
         bcrypt.compare(userData.Password,user.Password).then((status)=>{
           if(status){
             console.log("Success");
             response.user=user
             response.status=true
             resolve(response)
           }else{
             console.log("Failed");
             resolve({status:false})
           }

         })
        }else{
          console.log("Failed");
          resolve({status:false})
        }
      })
    },
    addToCart:(proId,userId)=>{
      let proObj={
        item:objectId(proId),
        quantity:1
      }
      return new Promise(async(resolve,reject)=>{
        let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        if(userCart){
          let proExist=userCart.products.findIndex(products=> products.item==proId)
          console.log(proExist)
          if(proExist!=-1){
            db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
            {
              $inc:{'products.$.quantity':1}
            }
            ).then(()=>{
              resolve()
            })
          }else{
        db.get().collection(collection.CART_COLLECTION)
        .updateOne({user:objectId(userId)},
        {
          
            $push:{products:proObj}
          
        }
        ).then((response)=>{
          resolve()
        })
      }
        }else{
          let cartObj={
            user:objectId(userId),
            products:[proObj]
          }
          db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
            resolve()
          })
        }
      })
    },
    getCartProducts:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
          {
            $match:{user:objectId(userId)}
          },
          {
            $unwind:'$products'
          },
          {
            $project:{
              item:'$products.item',
              quantity:'$products.quantity'
            }
          },
          {
            $lookup:{
              from:collection.PRODUCT_COLLECTION,
              localField:'item',
              foreignField:'_id',
              as:'product'
            }
          },
          {
              $project:{
                item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
              }
          }
       
        ]).toArray()
        resolve(cartItems)
      })
    },
    getCartCount:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        let count=0
        let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        if(cart){
          count=cart.products.length

        }
        resolve(count)
      })
    },
    changeProductQuantity:(details)=>{
     details.count=parseInt(details.count)
     details.quantity=parseInt(details.quantity)
      return new Promise((resolve,reject)=>{
        if(details.count==-1 && details.quantity==1){ 
        db.get().collection(collection.CART_COLLECTION)
        .updateOne({_id:objectId(details.cart)},
            {
              $pull:{products:{item:objectId(details.product)}}
            }
            ).then((response)=>{
              resolve({removeProduct:true})
            })
          }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart), 'products.item':objectId(details.product)},
            {
              $inc:{'products.$.quantity':details.count}
            }
            ).then((response)=>{
              resolve({status:true})
            })
          }
      })
    },
    getTotalAmount:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
          {
            $match:{user:objectId(userId)}
          },
          {
            $unwind:'$products'
          },
          {
            $project:{
              item:'$products.item',
              quantity:'$products.quantity'
            }
          },
          {
            $lookup:{
              from:collection.PRODUCT_COLLECTION,
              localField:'item',
              foreignField:'_id',
              as:'product'
            }
          },
          {
              $project:{
                item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
              }
          },
          {
            $group:{
              _id:null,
              total:{$sum:{$multiply:['$quantity','$product.Price']}}
            }
          }
        ]).toArray()
        console.log(total[0].total);
        resolve(total[0].total)
      })
    },
    placeOrder:(order,products,total)=>{
       return new Promise((resolve,reject)=>{
       console.log(order,products,total);
       let status=order['payment-method']==='COD'?'Placed':'Pending'
       let orderObj={
       deliveryDetails:{
         name:order.name,
         mobile:order.mobile,
         address:order.address,
         pincode:order.pincode
       },
       userId:objectId(order.userId),
       paymentMethod:order['payment-method'],
       products:products,
       totalAmount:total,
       status:status,
       day:new Date().getDate(),
       month:new Date().getMonth(),
       year:new Date().getFullYear()
       } 
       db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
         if(status=='Placed'){
        db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})
         } 
        resolve(response.ops[0]._id)
       })
      })
    },
    getCartProductList:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        resolve(cart.products)
      })
    },
    getUserOrders:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        console.log(userId);
        let orders=await db.get().collection(collection.ORDER_COLLECTION)
        .find({userId:objectId(userId)}).toArray()
        console.log(orders);
        resolve(orders)
      })
    },
    getOrderProducts:(orderId)=>{
      return new Promise(async(resolve,reject)=>{
        let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
          {
            $match:{_id:objectId(orderId)}
          },
          {
            $unwind:'$products'
          },
          {
            $project:{
              item:'$products.item',
              quantity:'$products.quantity'
            }
          },
          {
            $lookup:{
              from:collection.PRODUCT_COLLECTION,
              localField:'item',
              foreignField:'_id',
              as:'product'
            }
          },
          {
            $project:{
              item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
            }
          }
        ]).toArray()
        resolve(orderItems)
      })
    },
    generateRazorPay:(orderId,total)=>{
      return new Promise((resolve,reject)=>{
        var options = {
          amount: total*100,
          currency: "INR",
          receipt: ""+orderId
        }
        instance.orders.create(options, function(err, order) {
          if(err){
            console.log(err);
          }else{
          console.log('New Order:',order);
          resolve(order)
        }
        });
      })
    },
    verifyPayment:(details)=>{
      return new Promise((resolve,reject)=>{
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', 'Y6k49kYdekn5xMd9HB5gY50o');
        hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
        hmac=hmac.digest('hex')
        if(hmac==details['payment[razorpay_signature]']){
         resolve()
      }else{
        reject()
      }
      })
    },
    changePaymentStatus:(orderId)=>{
      return new Promise((resolve,reject)=>{
        db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({_id:ObjectId(orderId)},
        {
          $set:{
            status:'placed'
          }
      }).then(()=>{
        resolve()
      })
    })
  },
  deleteCartProduct:(details)=>{
    return new Promise(async(resolve,reject)=>{
    db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
    {
      $pull:{products:{item:objectId(details.product)}}
    }).then((response)=>{
      resolve({removeProduct:true})
    })
    })
    }
  }
