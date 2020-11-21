var express = require('express');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var hbsHelpers = require('../helpers/hbs-helpers');
const adminLogin=(req,res,next)=>{
  if(req.session.loggedAdminIn){
    next()
  }else{
    res.redirect('/admin/login')
  }
}
router.get('/', function(req,res) {
  productHelpers.getAllProducts().then((products)=>{
    let findex=hbsHelpers.formatIndex;
    if(req.session.admin){
      res.render('admin/view-products',{admin:true,products,helpers:{findex}})    
    }else{
     res.redirect('admin/login')
    }

  })
});
router.get('/login', function(req, res) {
   if(req.session.admin){
     res.redirect('/admin')
   }else{
    res.render('admin/login')
   }
  })
router.post('/login',(req,res)=>{
  productHelpers.doAdminLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedAdminIn=true
      req.session.admin=response.admin
    res.redirect('/admin')
  }else{
    res.redirect('/admin/login')
  }
  })
});
router.get('/adminout',function(req,res){
  req.session.destroy()
  res.redirect('/admin/login')
})
  router.get('/add-product',adminLogin,function(req,res){
    res.render('admin/add-product')
  })

router.post('/add-product',(req,res)=>{


  productHelpers.addProduct(req.body,(id)=>{
   let image=req.files.Image
    console.log(id); 
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
    if(!err){
      res.render("admin/add-product"  )

     }else{
       console.log(err);
     }
   })
  })
})

router.get('/delete-product/:id',adminLogin,(req,res)=>{
let proId=req.params.id
productHelpers.deleteProduct(proId).then((response)=>{
  res.redirect('/admin/')
})
})
router.get('/edit-product/:id',adminLogin,async (req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image)
    {
      let image=req.files.Image
    console.log(id); 
    image.mv('./public/product-images/'+id+'.jpg')
  
    }
  })
})
router.get('/all-orders',adminLogin,async (req,res)=>{
  let userorders=await productHelpers.getOrders(req.body)
  let findex=hbsHelpers.formatIndex;
  res.render('admin/all-orders.hbs',{admin:true,helpers:{findex},userorders})
})
router.get('/all-users',adminLogin,(req,res)=>{
  productHelpers.userData().then((users)=>{
  res.render('admin/allusers',{admin:true,users})
})
})
router.get('/shipOrders/:id',(req,res)=>{
  productHelpers.shippedStatus(req.params.id).then(()=>{
    res.redirect('/admin/all-orders')
  })
})
router.get('/view-adminproducts/:id',adminLogin,async(req,res)=>{
  let products=await productHelpers.OrdersAdmin(req.params.id)
  res.render('admin/view-order-details',{products,admin:true})
})
module.exports = router;
