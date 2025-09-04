import api from './api';

 export const fetchProducts = async (category) => {
   const res = await api.get('/products', { params: { category } });
   return res.data;
 };

 export const createProduct = async (payload) => {
   const res = await api.post('/products', payload);
   return res.data;
 };

 export const deleteProduct = async (id) => {
   const res = await api.delete(`/products/${id}`);
   return res.data;
 };

export const uploadImage = async (file) => {
  const form = new FormData();
  form.append('image', file);
  try {
    const res = await api.post('/upload', form); // let axios set multipart headers
    return res.data; // { url, public_id }
  } catch (err) {
    const details = err?.response?.data?.details || err?.response?.data?.message || err.message;
    throw new Error(details);
  }
};


// alias so pages/Home.jsx keeps working
export const getProducts = fetchProducts