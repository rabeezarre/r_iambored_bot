import TelegramBot from "node-telegram-bot-api";
import axios, {AxiosResponse} from 'axios';

const token = "your token"
const bot = new TelegramBot(token, {polling: true});

const API_URL = "http://www.boredapi.com/api/activity/";

type ResponseR = {
    activity: string;
    accessibility: number;
    type: string;
    participants: number;
    price: number;
    link: string;
    key: number;
}

let state = "default";

type Filter = {
    accessibility?: number;
    type?: string;
    participants?: number;
    price?: number;
}

let filters: Filter = {}

const typeMessageOptions: TelegramBot.SendMessageOptions = {
    reply_markup: {
        inline_keyboard:[
            [
                {
                    text: "Education",
                    callback_data: "type_education"
                },
                {
                    text: "Recreational",
                    callback_data: "type_recreational"
                },
                {
                    text: "Busywork",
                    callback_data: "type_busywork"
                }

            ],
            [
                {
                    text: "Social",
                    callback_data: "type_social"
                },
                {
                    text: "Diy",
                    callback_data: "type_diy"
                },
                {
                    text: "Music",
                    callback_data: "type_music"
                }
            ],
            [
                {
                    text: "Charity",
                    callback_data: "type_charity"
                },
                {
                    text: "Cooking",
                    callback_data: "type_cooking"
                },
                {
                    text: "Relaxation",
                    callback_data: "type_relaxation"
                }
            ],
            [
                {
                    text: "Skip",
                    callback_data: "type_skip"
                }
            ]
        ]
    }
}

const typeArr = ["education", "recreational", "social", "diy", "charity", "cooking", "relaxation", "music", "busywork", "skip"];

const priceMessageOptions: TelegramBot.SendMessageOptions = {
    reply_markup: {
        inline_keyboard:[
            [
                {
                    text: "Free",
                    callback_data: "price_free"
                },
                {
                    text: "Ready to spend",
                    callback_data: "price_paid"
                }

            ],
            [
                {
                    text: "Skip",
                    callback_data: "price_skip"
                }
            ]
        ]
    }

}

const menuMessageOptions: TelegramBot.SendMessageOptions = {
    reply_markup: {
        inline_keyboard:[
            [
                {
                    text: "Random",
                    callback_data: "random"
                },
                {
                    text: "Filtered",
                    callback_data: "filtered"
                }

            ],
        ]
    }
}

bot.on('message', (msg)=> {

    if (msg.text === '/start') {
        bot.sendMessage(msg.chat.id, "You Are Bored? This bot will help you find interesting activities! Find:", menuMessageOptions)

    }
    else if (state === "filter_participants") {

        if (msg.text?.toLowerCase() === "skip"){
            state = "filter_price";
            bot.sendMessage(msg.chat.id, "For free or ready to spend some money?", priceMessageOptions);
            return;
        }
        const participantsNum: number = parseInt(msg.text || "");
        if(participantsNum < 1 || participantsNum > 8 || isNaN(participantsNum))   {
            bot.sendMessage(msg.chat.id, "Incorrect input, repeat please")
            return;
        }

        filters.participants = participantsNum;
        state = "filter_price";
        bot.sendMessage(msg.chat.id, "For free or ready to spend some money?", priceMessageOptions);
    }

});


bot.on("callback_query", (cb)=> {
    // console.log(cb.data);
    if(cb.data === "filtered") {
        if (cb.message){
            state = "filter_participants";
            bot.sendMessage(cb.message.chat.id, "To choose the number of participants input integer from 1 to 8 or write 'skip' to skip")
                .then(() => bot.answerCallbackQuery(cb.id))
        }
        return;
    }

    if (cb.data === "random" && state === "default") {
        axios.get<ResponseR>(API_URL)
            .then((res) => res.data)
            .then((obj) => {
                if(cb.message) {
                    return bot.sendMessage(cb.message.chat.id, obj.activity)
                }
            })
            .then(() => bot.answerCallbackQuery(cb.id))
        return;
    }

    if (state === "filter_price") {
        if (cb.message){
            if(cb.data !== "price_free" && cb.data !== "price_paid" && cb.data !== "price_skip") {
                bot.sendMessage(cb.message.chat.id, "You did something wrong, please, repeat", priceMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
                return;
            }
            if(cb.data === "price_free") {
                filters.price = 0;
                state = "filter_type";
                bot.sendMessage(cb.message.chat.id, "Choose the type:", typeMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
            }
            else if (cb.data === "price_paid") {
                filters.price = 1;
                state = "filter_type";
                bot.sendMessage(cb.message.chat.id, "Choose the type:", typeMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
            }
            else if (cb.data === "price_skip") {
                state = "filter_type";
                bot.sendMessage(cb.message.chat.id, "Choose the type:", typeMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
            }

        }
        return;
    }

    if (state === "filter_type") {
        if (cb.message){
            if(!cb.data?.includes("type_")) {
                bot.sendMessage(cb.message.chat.id, "You did something wrong, please, repeat", typeMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
                return;
            }

            const type = cb.data?.replace("type_","");

            if(typeArr.indexOf(type) < 0) {
                bot.sendMessage(cb.message.chat.id, "You did something wrong, please, repeat", typeMessageOptions).then(() => bot.answerCallbackQuery(cb.id));
                return;
            }

            if (type === "skip"){
                filters.type = undefined;
            } else {
                filters.type = type;
            }

            axios.get<ResponseR>(API_URL, {params: filters})
                .then((obj) => {
                    if(cb.message) {
                        if (obj.data.activity === undefined) {
                            return bot.sendMessage(cb.message.chat.id, "Sorry, there is no suitable activity for you in our base. Maybe try different input?");
                        } else {
                            return bot.sendMessage(cb.message.chat.id, "Activity: " + obj.data.activity);
                        }

                    }
                })
                .then(() => bot.answerCallbackQuery(cb.id))
                .then(() => state = "default")

        }
    }




});
